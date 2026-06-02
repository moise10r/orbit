import {
  Injectable, ConflictException, UnauthorizedException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { Workspace } from './entities/workspace.entity';
import { ApiKey } from './entities/api-key.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)   private readonly userRepo: Repository<User>,
    @InjectRepository(Workspace) private readonly wsRepo: Repository<Workspace>,
    @InjectRepository(ApiKey) private readonly keyRepo: Repository<ApiKey>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const [emailTaken, slugTaken] = await Promise.all([
      this.userRepo.findOne({ where: { email: dto.email } }),
      this.wsRepo.findOne({ where: { slug: dto.workspaceSlug } }),
    ]);
    if (emailTaken) throw new ConflictException('Email already registered');
    if (slugTaken)  throw new ConflictException('Workspace slug already taken');

    const workspace = await this.wsRepo.save(
      this.wsRepo.create({ slug: dto.workspaceSlug, name: dto.workspaceName }),
    );

    const user = await this.userRepo.save(
      this.userRepo.create({
        email: dto.email,
        name: dto.name,
        passwordHash: await bcrypt.hash(dto.password, SALT_ROUNDS),
        role: 'owner',
        workspaceId: workspace.id,
      }),
    );

    const tokens = await this.issueTokens(user);
    return { user: this.sanitize(user), workspace, ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
      select: ['id', 'email', 'name', 'role', 'workspaceId', 'passwordHash'],
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.issueTokens(user);
    return { user: this.sanitize(user), ...tokens };
  }

  async refresh(token: string) {
    let payload: { sub: string };
    try {
      payload = this.jwt.verify<{ sub: string }>(token, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.userRepo.findOne({
      where: { id: payload.sub },
      select: ['id', 'email', 'name', 'role', 'workspaceId', 'refreshTokenHash'],
    });
    if (!user?.refreshTokenHash) throw new UnauthorizedException('Session expired');

    const valid = token === user.refreshTokenHash;
    if (!valid) throw new UnauthorizedException('Refresh token reuse detected');

    return this.issueTokens(user);
  }

  async createApiKey(workspaceId: string, name: string): Promise<{ key: string; record: ApiKey }> {
    const raw = `orbit_${randomBytes(32).toString('hex')}`;
    const keyHash = createHash('sha256').update(raw).digest('hex');

    const record = await this.keyRepo.save(
      this.keyRepo.create({
        name,
        keyHash,
        keyPrefix: raw.slice(0, 12),
        workspaceId,
      }),
    );

    return { key: raw, record };
  }

  async revokeApiKey(id: string, workspaceId: string): Promise<void> {
    const key = await this.keyRepo.findOne({ where: { id, workspaceId } });
    if (!key) throw new BadRequestException('API key not found');
    await this.keyRepo.update(id, { active: false });
  }

  async listApiKeys(workspaceId: string): Promise<ApiKey[]> {
    return this.keyRepo.find({
      where: { workspaceId, active: true },
      select: ['id', 'name', 'keyPrefix', 'lastUsedAt', 'expiresAt', 'createdAt'],
      order: { createdAt: 'DESC' },
    });
  }

  private async issueTokens(user: User) {
    const payload = { sub: user.id, email: user.email, workspaceId: user.workspaceId, role: user.role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('JWT_SECRET'),
        expiresIn: this.config.get<string>('JWT_EXPIRES_IN') ?? '15m',
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d',
      }),
    ]);

    await this.userRepo.update(user.id, {
      refreshTokenHash: await bcrypt.hash(refreshToken, SALT_ROUNDS),
    });

    return { accessToken, refreshToken };
  }

  private sanitize(user: User) {
    const { passwordHash: _, refreshTokenHash: __, ...safe } = user as User & { passwordHash?: string; refreshTokenHash?: string };
    return safe;
  }
}
