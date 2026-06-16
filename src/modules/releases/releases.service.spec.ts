import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ReleasesService } from './releases.service';
import { Release } from './entities/release.entity';
import { Deployment } from './entities/deployment.entity';
import { Environment } from './entities/environment.entity';

const mockEnvironment = (overrides: Partial<Environment> = {}): Environment =>
  ({
    id: 'env-1', workspaceId: 'ws-1', name: 'Production',
    tier: 'production', slug: 'production', active: true,
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  } as Environment);

const mockDeployment = (overrides: Partial<Deployment> = {}): Deployment =>
  ({
    id: 'dep-1', releaseId: 'rel-1', environmentId: 'env-1',
    environmentName: 'Production', status: 'success', startedAt: new Date(),
    ...overrides,
  } as Deployment);

const mockRelease = (overrides: Partial<Release> = {}): Release =>
  ({
    id: 'rel-1', workspaceId: 'ws-1', version: '1.0.0',
    status: 'deployed', createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  } as Release);

describe('ReleasesService.getEnvironmentHealth', () => {
  let service: ReleasesService;
  let envRepo: { findOne: jest.Mock };
  let deployRepo: { find: jest.Mock };
  let releaseRepo: { findOne: jest.Mock; findBy: jest.Mock; find: jest.Mock; save: jest.Mock; create: jest.Mock; update: jest.Mock; remove: jest.Mock; createQueryBuilder: jest.Mock };

  beforeEach(async () => {
    envRepo     = { findOne: jest.fn() };
    deployRepo  = { find: jest.fn() };
    releaseRepo = {
      findOne: jest.fn(), findBy: jest.fn(), find: jest.fn(),
      save: jest.fn(), create: jest.fn(), update: jest.fn(),
      remove: jest.fn(), createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReleasesService,
        { provide: getRepositoryToken(Environment), useValue: { ...envRepo, find: jest.fn(), save: jest.fn(), create: jest.fn() } },
        { provide: getRepositoryToken(Deployment),  useValue: { ...deployRepo, save: jest.fn(), create: jest.fn(), createQueryBuilder: jest.fn() } },
        { provide: getRepositoryToken(Release),     useValue: releaseRepo },
      ],
    }).compile();

    service = module.get<ReleasesService>(ReleasesService);
    // Re-grab the mocks from the compiled module's injected repositories
    const envR     = module.get(getRepositoryToken(Environment));
    const deployR  = module.get(getRepositoryToken(Deployment));
    const releaseR = module.get(getRepositoryToken(Release));
    envRepo.findOne     = envR.findOne;
    deployRepo.find     = deployR.find;
    releaseRepo.findOne = releaseR.findOne;
  });

  it('throws NotFoundException when environment is not found', async () => {
    jest.spyOn(module.get(getRepositoryToken(Environment)), 'findOne').mockResolvedValue(null);
    await expect(service.getEnvironmentHealth('ws-1', 'env-missing')).rejects.toThrow(NotFoundException);
  });

  it('returns "healthy" when all recent deployments succeeded', async () => {
    const deployments = [mockDeployment(), mockDeployment({ id: 'dep-2' })];
    jest.spyOn(module.get(getRepositoryToken(Environment)), 'findOne').mockResolvedValue(mockEnvironment());
    jest.spyOn(module.get(getRepositoryToken(Deployment)),  'find').mockResolvedValue(deployments);
    jest.spyOn(module.get(getRepositoryToken(Release)),     'findOne').mockResolvedValue(mockRelease());

    const health = await service.getEnvironmentHealth('ws-1', 'env-1');
    expect(health.status).toBe('healthy');
    expect(health.failureRate).toBe(0);
    expect(health.successCount).toBe(2);
    expect(health.currentVersion).toBe('1.0.0');
  });

  it('returns "degraded" when failure rate is between 0.20 and 0.50', async () => {
    const deployments = [
      mockDeployment({ id: 'dep-1', status: 'success' }),
      mockDeployment({ id: 'dep-2', status: 'success' }),
      mockDeployment({ id: 'dep-3', status: 'failed' }),
    ];
    jest.spyOn(module.get(getRepositoryToken(Environment)), 'findOne').mockResolvedValue(mockEnvironment());
    jest.spyOn(module.get(getRepositoryToken(Deployment)),  'find').mockResolvedValue(deployments);
    jest.spyOn(module.get(getRepositoryToken(Release)),     'findOne').mockResolvedValue(mockRelease());

    const health = await service.getEnvironmentHealth('ws-1', 'env-1');
    expect(health.status).toBe('degraded');
    expect(health.failedCount).toBe(1);
    expect(health.failureRate).toBeCloseTo(1 / 3);
  });

  it('returns "unhealthy" when failure rate >= 0.50', async () => {
    const deployments = [
      mockDeployment({ id: 'dep-1', status: 'failed' }),
      mockDeployment({ id: 'dep-2', status: 'failed' }),
      mockDeployment({ id: 'dep-3', status: 'success' }),
    ];
    jest.spyOn(module.get(getRepositoryToken(Environment)), 'findOne').mockResolvedValue(mockEnvironment());
    jest.spyOn(module.get(getRepositoryToken(Deployment)),  'find').mockResolvedValue(deployments);
    jest.spyOn(module.get(getRepositoryToken(Release)),     'findOne').mockResolvedValue(mockRelease());

    const health = await service.getEnvironmentHealth('ws-1', 'env-1');
    expect(health.status).toBe('unhealthy');
    expect(health.failedCount).toBe(2);
  });

  it('returns "healthy" with zero deployments in window', async () => {
    jest.spyOn(module.get(getRepositoryToken(Environment)), 'findOne').mockResolvedValue(mockEnvironment());
    jest.spyOn(module.get(getRepositoryToken(Deployment)),  'find').mockResolvedValue([]);

    const health = await service.getEnvironmentHealth('ws-1', 'env-1');
    expect(health.status).toBe('healthy');
    expect(health.totalDeployments).toBe(0);
    expect(health.currentVersion).toBeNull();
    expect(health.lastDeployedAt).toBeNull();
  });
});
