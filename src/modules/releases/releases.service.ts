import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { ServicesService } from '../services/services.service';
import { CreateReleaseDto } from './dto/create-release.dto';
import { UpdateReleaseDto } from './dto/update-release.dto';
import { Release, ReleaseEnvironment } from './entities/release.entity';

@Injectable()
export class ReleasesService {
  constructor(
    @InjectRepository(Release) private readonly repo: Repository<Release>,
    private readonly servicesService: ServicesService,
  ) {}

  async create(dto: CreateReleaseDto, user: User): Promise<Release> {
    await this.servicesService.findOne(dto.serviceId);
    const release = this.repo.create({ ...dto, createdById: user.id });
    return this.repo.save(release);
  }

  findAll(serviceId?: string, environment?: ReleaseEnvironment): Promise<Release[]> {
    return this.repo.find({
      where: {
        ...(serviceId ? { serviceId } : {}),
        ...(environment ? { environment } : {}),
      },
      relations: ['service'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Release> {
    const release = await this.repo.findOne({ where: { id }, relations: ['service', 'createdBy'] });
    if (!release) throw new NotFoundException(`Release ${id} not found`);
    return release;
  }

  async update(id: string, dto: UpdateReleaseDto): Promise<Release> {
    const release = await this.findOne(id);
    Object.assign(release, dto);
    return this.repo.save(release);
  }

  async remove(id: string): Promise<void> {
    const release = await this.findOne(id);
    await this.repo.remove(release);
  }
}
