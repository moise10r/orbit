import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Service } from '../../services/entities/service.entity';
import { User } from '../../auth/entities/user.entity';

export enum ReleaseStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  DEPLOYED = 'deployed',
  FAILED = 'failed',
  ROLLED_BACK = 'rolled_back',
}

export enum ReleaseEnvironment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
}

@Entity('releases')
export class Release {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column()
  version: string;

  @ApiProperty({ required: false })
  @Column({ nullable: true })
  notes: string;

  @ApiProperty({ enum: ReleaseStatus })
  @Column({ type: 'enum', enum: ReleaseStatus, default: ReleaseStatus.PENDING })
  status: ReleaseStatus;

  @ApiProperty({ enum: ReleaseEnvironment })
  @Column({ type: 'enum', enum: ReleaseEnvironment, default: ReleaseEnvironment.STAGING })
  environment: ReleaseEnvironment;

  @ApiProperty({ required: false })
  @Column({ nullable: true })
  commitSha: string;

  @ApiProperty({ required: false })
  @Column({ nullable: true })
  deployedAt: Date;

  @ManyToOne(() => Service, (s) => s.releases, { nullable: false, onDelete: 'CASCADE' })
  service: Service;

  @Column()
  serviceId: string;

  @ManyToOne(() => User, { eager: false, nullable: false })
  createdBy: User;

  @Column()
  createdById: string;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
