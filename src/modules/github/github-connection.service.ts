import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { Repository } from 'typeorm';
import { ConnectRepoDto } from './dto/connect-repo.dto';
import { GitHubConnection } from './entities/github-connection.entity';

@Injectable()
export class GitHubConnectionService {
  private readonly encKey: Buffer;

  constructor(
    @InjectRepository(GitHubConnection)
    private readonly repo: Repository<GitHubConnection>,
    config: ConfigService,
  ) {
    const secret = config.getOrThrow<string>('ENCRYPTION_SECRET');
    this.encKey = scryptSync(secret, 'orbit-gh', 32) as Buffer;
  }

  async connect(dto: ConnectRepoDto, userId: string): Promise<GitHubConnection> {
    const existing = await this.repo.findOne({ where: { serviceId: dto.serviceId } });
    if (existing) {
      throw new ConflictException(`Service ${dto.serviceId} is already linked to a GitHub repository`);
    }

    const webhookSecret = randomBytes(24).toString('hex');
    const encryptedToken = dto.accessToken ? this.encrypt(dto.accessToken) : null;

    const connection = this.repo.create({
      serviceId: dto.serviceId,
      linkedByUserId: userId,
      repoOwner: dto.repoOwner,
      repoName: dto.repoName,
      defaultBranch: dto.defaultBranch ?? 'main',
      webhookSecret,
      encryptedToken,
    });

    return this.repo.save(connection);
  }

  async findByService(serviceId: string): Promise<GitHubConnection> {
    const connection = await this.repo.findOne({ where: { serviceId } });
    if (!connection) throw new NotFoundException(`No GitHub connection for service ${serviceId}`);
    return connection;
  }

  async disconnect(serviceId: string): Promise<void> {
    const connection = await this.findByService(serviceId);
    await this.repo.remove(connection);
  }

  async findByRepo(owner: string, repo: string): Promise<GitHubConnection | null> {
    return this.repo
      .createQueryBuilder('c')
      .addSelect('c.encryptedToken')
      .where('c.repoOwner = :owner AND c.repoName = :repo AND c.isActive = true', { owner, repo })
      .getOne();
  }

  decryptToken(connection: GitHubConnection): string | undefined {
    if (!connection.encryptedToken) return undefined;
    return this.decrypt(connection.encryptedToken);
  }

  private encrypt(plain: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', this.encKey, iv);
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  private decrypt(stored: string): string {
    const [ivHex, encHex] = stored.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const enc = Buffer.from(encHex, 'hex');
    const decipher = createDecipheriv('aes-256-cbc', this.encKey, iv);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
  }
}
