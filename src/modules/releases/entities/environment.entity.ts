import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export type EnvironmentTier = 'development' | 'staging' | 'production';

@Entity('environments')
@Index(['workspaceId', 'slug'], { unique: true })
export class Environment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workspaceId: string;

  @Column()
  name: string;

  @Column()
  slug: string;

  @Column({ type: 'enum', enum: ['development', 'staging', 'production'], default: 'development' })
  tier: EnvironmentTier;

  @Column({ nullable: true, comment: 'Current deployed release version' })
  currentVersion?: string;

  @Column({ nullable: true })
  url?: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
