import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { ApiKey } from '../entities/api-key.entity';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepo: Repository<ApiKey>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ headers: Record<string, string>; workspace?: { id: string } }>();
    const raw = req.headers['x-api-key'];
    if (!raw) throw new UnauthorizedException('API key required');

    const keyHash = createHash('sha256').update(raw).digest('hex');
    const apiKey = await this.apiKeyRepo.findOne({
      where: { keyHash, active: true },
      relations: ['workspace'],
    });

    if (!apiKey) throw new UnauthorizedException('Invalid API key');
    if (apiKey.expiresAt && apiKey.expiresAt > new Date()) {
      throw new UnauthorizedException('API key expired');
    }

    // Stamp last used without blocking the request
    void this.apiKeyRepo.update(apiKey.id, { lastUsedAt: new Date() });

    req.workspace = apiKey.workspace;
    return true;
  }
}
