import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { Service } from './entities/service.entity';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service) private readonly repo: Repository<Service>,
  ) {}

  async create(dto: CreateServiceDto, owner: User): Promise<Service> {
    const existing = await this.repo.findOne({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException(`Service with slug "${dto.slug}" already exists`);

    const service = this.repo.create({ ...dto, ownerId: owner.id });
    return this.repo.save(service);
  }

  findAll(ownerId?: string): Promise<Service[]> {
    return this.repo.find({
      where: ownerId ? { ownerId } : {},
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Service> {
    const service = await this.repo.findOne({ where: { id } });
    if (!service) throw new NotFoundException(`Service ${id} not found`);
    return service;
  }

  async findBySlug(slug: string): Promise<Service> {
    const service = await this.repo.findOne({ where: { slug } });
    if (!service) throw new NotFoundException(`Service "${slug}" not found`);
    return service;
  }

  async update(id: string, dto: UpdateServiceDto, requestor: User): Promise<Service> {
    const service = await this.findOne(id);
    if (service.ownerId !== requestor.id) throw new ForbiddenException();
    Object.assign(service, dto);
    return this.repo.save(service);
  }

  async remove(id: string, requestor: User): Promise<void> {
    const service = await this.findOne(id);
    if (service.ownerId !== requestor.id) throw new ForbiddenException();
    await this.repo.remove(service);
  }
}
