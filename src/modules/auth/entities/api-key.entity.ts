import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Workspace } from './workspace.entity';

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Index({ unique: true })
  @Column({ comment: 'SHA-256 hash of the raw key — never store plaintext' })
  keyHash: string;

  @Column({ comment: 'First 8 chars of the key so users can identify it' })
  keyPrefix: string;

  @Column()
  workspaceId: string;

  @ManyToOne(() => Workspace, (w) => w.apiKeys, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Workspace;

  @Column({ nullable: true })
  lastUsedAt?: Date;

  @Column({ nullable: true })
  expiresAt?: Date;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
