import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToMany, Index,
} from 'typeorm';
import { Deployment } from './deployment.entity';

export type ReleaseStatus = 'draft' | 'staged' | 'deployed' | 'rolled_back' | 'failed';

@Entity('releases')
@Index(['workspaceId', 'version'], { unique: true })
export class Release {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workspaceId: string;

  @Column({ comment: 'Semantic version — e.g. 1.4.2' })
  version: string;

  @Column({ nullable: true })
  title?: string;

  @Column({ type: 'text', nullable: true, comment: 'Markdown changelog for this release' })
  changelog?: string;

  @Column({ nullable: true, comment: 'Git commit SHA this release was built from' })
  commitSha?: string;

  @Column({ nullable: true, comment: 'Git tag' })
  tag?: string;

  @Column({
    type: 'enum',
    enum: ['draft', 'staged', 'deployed', 'rolled_back', 'failed'],
    default: 'draft',
  })
  status: ReleaseStatus;

  @Column({ nullable: true })
  createdById?: string;

  @OneToMany(() => Deployment, (d) => d.release, { cascade: true })
  deployments: Deployment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
