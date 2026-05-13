import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Release } from './release.entity';

export type DeploymentStatus = 'pending' | 'running' | 'success' | 'failed' | 'rolled_back';

@Entity('deployments')
@Index(['releaseId', 'environmentId'])
export class Deployment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  releaseId: string;

  @ManyToOne(() => Release, (r) => r.deployments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'releaseId' })
  release: Release;

  @Column()
  environmentId: string;

  @Column()
  environmentName: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'running', 'success', 'failed', 'rolled_back'],
    default: 'pending',
  })
  status: DeploymentStatus;

  @Column({ nullable: true })
  triggeredById?: string;

  @Column({ nullable: true })
  triggeredByName?: string;

  @Column({ nullable: true })
  completedAt?: Date;

  @Column({ type: 'text', nullable: true, comment: 'Raw deploy log output' })
  log?: string;

  @Column({ type: 'jsonb', nullable: true, comment: 'Arbitrary deploy metadata (pipeline URL, runner, etc.)' })
  meta?: Record<string, unknown>;

  @CreateDateColumn()
  startedAt: Date;
}
