import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('github_connections')
@Index(['serviceId'], { unique: true })
export class GitHubConnection {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'FK → services.id (from multi-service PR)' })
  @Column('uuid')
  serviceId: string;

  @ApiProperty({ description: 'User who linked the repo' })
  @Column('uuid')
  linkedByUserId: string;

  @ApiProperty({ example: 'acme' })
  @Column()
  repoOwner: string;

  @ApiProperty({ example: 'payments-api' })
  @Column()
  repoName: string;

  @ApiProperty({ description: 'Branch to watch for release events', default: 'main' })
  @Column({ default: 'main' })
  defaultBranch: string;

  @ApiProperty({ description: 'Hashed webhook secret stored for signature verification' })
  @Column()
  webhookSecret: string;

  @ApiProperty({ required: false, description: 'GitHub App installation ID, if using GitHub App auth' })
  @Column({ nullable: true })
  installationId: number;

  @ApiProperty({ required: false, description: 'Personal access token (encrypted at rest)' })
  @Column({ nullable: true, select: false })
  encryptedToken: string;

  @ApiProperty()
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
