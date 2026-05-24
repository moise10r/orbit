import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../auth/entities/user.entity';

export enum ServiceLanguage {
  TYPESCRIPT = 'typescript',
  PYTHON = 'python',
  GO = 'go',
  JAVA = 'java',
  RUBY = 'ruby',
  OTHER = 'other',
}

@Entity('services')
export class Service {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column()
  name: string;

  @ApiProperty()
  @Column({ unique: true })
  slug: string;

  @ApiProperty({ required: false })
  @Column({ nullable: true })
  description: string;

  @ApiProperty({ required: false })
  @Column({ nullable: true })
  repositoryUrl: string;

  @ApiProperty({ enum: ServiceLanguage, required: false })
  @Column({ type: 'enum', enum: ServiceLanguage, nullable: true })
  language: ServiceLanguage;

  @ApiProperty()
  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => User, { eager: false, nullable: false })
  owner: User;

  @Column()
  ownerId: string;

  // populated when ReleasesModule is loaded
  @OneToMany('Release', 'service')
  releases: unknown[];

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
