import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Release } from './entities/release.entity';
import { Deployment } from './entities/deployment.entity';
import { Environment } from './entities/environment.entity';
import {
  CreateReleaseDto, UpdateReleaseDto,
  CreateDeploymentDto, UpdateDeploymentDto,
} from './dto/release.dto';

@Injectable()
export class ReleasesService {
  constructor(
    @InjectRepository(Release)   private readonly releaseRepo: Repository<Release>,
    @InjectRepository(Deployment) private readonly deployRepo: Repository<Deployment>,
    @InjectRepository(Environment) private readonly envRepo: Repository<Environment>,
  ) {}

  // ── Releases ────────────────────────────────────────────────────────────────

  async create(workspaceId: string, dto: CreateReleaseDto, userId?: string): Promise<Release> {
    const existing = await this.releaseRepo.findOne({ where: { workspaceId, version: dto.version } });
    if (existing) throw new ConflictException(`Release ${dto.version} already exists`);

    return this.releaseRepo.save(
      this.releaseRepo.create({ ...dto, workspaceId, createdById: userId }),
    );
  }

  async list(workspaceId: string): Promise<Release[]> {
    return this.releaseRepo.find({
      where: { workspaceId },
      relations: ['deployments'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(workspaceId: string, id: string): Promise<Release> {
    const release = await this.releaseRepo.findOne({
      where: { id, workspaceId },
      relations: ['deployments'],
    });
    if (!release) throw new NotFoundException(`Release ${id} not found`);
    return release;
  }

  async update(workspaceId: string, id: string, dto: UpdateReleaseDto): Promise<Release> {
    const release = await this.findOne(workspaceId, id);
    Object.assign(release, dto);
    return this.releaseRepo.save(release);
  }

  async remove(workspaceId: string, id: string): Promise<void> {
    const release = await this.findOne(workspaceId, id);
    if (release.status === 'deployed') {
      throw new BadRequestException('Cannot delete a deployed release — roll it back first');
    }
    await this.releaseRepo.remove(release);
  }

  // ── Deployments ─────────────────────────────────────────────────────────────

  async deploy(workspaceId: string, releaseId: string, dto: CreateDeploymentDto): Promise<Deployment> {
    const [release, env] = await Promise.all([
      this.findOne(workspaceId, releaseId),
      this.envRepo.findOne({ where: { id: dto.environmentId, workspaceId } }),
    ]);

    if (!env) throw new NotFoundException(`Environment ${dto.environmentId} not found`);
    if (env.tier === 'production' && release.status !== 'staged') {
      throw new BadRequestException('Release must be staged before deploying to production');
    }

    const deployment = await this.deployRepo.save(
      this.deployRepo.create({
        releaseId,
        environmentId: env.id,
        environmentName: env.name,
        triggeredByName: dto.triggeredByName,
        meta: dto.meta,
        status: 'running',
      }),
    );

    // Update release status based on environment tier
    const newStatus = env.tier === 'production' ? 'deployed' : 'staged';
    await this.releaseRepo.update(releaseId, { status: newStatus });

    return deployment;
  }

  async updateDeployment(
    workspaceId: string,
    releaseId: string,
    deployId: string,
    dto: UpdateDeploymentDto,
  ): Promise<Deployment> {
    const deployment = await this.deployRepo.findOne({
      where: { id: deployId, releaseId },
      relations: ['release'],
    });
    if (!deployment || deployment.release.workspaceId !== workspaceId) {
      throw new NotFoundException('Deployment not found');
    }

    const update: Partial<Deployment> = {
      status: dto.status as Deployment['status'],
      log: dto.log,
    };
    if (['success', 'failed', 'rolled_back'].includes(dto.status)) {
      update.completedAt = new Date();
    }
    if (dto.status === 'failed') {
      await this.releaseRepo.update(releaseId, { status: 'failed' });
    }
    if (dto.status === 'rolled_back') {
      await this.releaseRepo.update(releaseId, { status: 'rolled_back' });
    }

    Object.assign(deployment, update);
    return this.deployRepo.save(deployment);
  }

  async rollback(workspaceId: string, releaseId: string): Promise<Release> {
    const release = await this.findOne(workspaceId, releaseId);
    if (!['deployed', 'failed'].includes(release.status)) {
      throw new BadRequestException('Only deployed or failed releases can be rolled back');
    }

    await this.deployRepo
      .createQueryBuilder()
      .update()
      .set({ status: 'rolled_back', completedAt: new Date() })
      .where('releaseId = :releaseId AND status IN (:...statuses)', {
        releaseId,
        statuses: ['running', 'success'],
      })
      .execute();

    await this.releaseRepo.update(releaseId, { status: 'rolled_back' });
    return this.findOne(workspaceId, releaseId);
  }

  // ── Environments ────────────────────────────────────────────────────────────

  async listEnvironments(workspaceId: string): Promise<Environment[]> {
    return this.envRepo.find({ where: { workspaceId, active: true }, order: { tier: 'ASC' } });
  }

  async createEnvironment(workspaceId: string, name: string, tier: string, url?: string): Promise<Environment> {
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    const existing = await this.envRepo.findOne({ where: { workspaceId, slug } });
    if (existing) throw new ConflictException(`Environment "${name}" already exists`);
    return this.envRepo.save(
      this.envRepo.create({ workspaceId, name, slug, tier: tier as Environment['tier'], url }),
    );
  }

  async getEnvironmentBadgeData(
    envId: string,
  ): Promise<{ env: Environment | null; latestDeployment: Deployment | null }> {
    const env = await this.envRepo.findOne({ where: { id: envId } });
    if (!env) return { env: null, latestDeployment: null };

    const latestDeployment = await this.deployRepo.findOne({
      where: { environmentId: envId },
      relations: ['release'],
      order: { startedAt: 'DESC' },
    });

    return { env, latestDeployment: latestDeployment ?? null };
  }
}
