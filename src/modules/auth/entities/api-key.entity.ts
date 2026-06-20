import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn, Index
} from 'typeorm';
import { Workspace } from './workspace.entity';

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  /**
   * SHA-256 hash of the raw key — never store plaintext
   * @unique
   */
  @Index({ unique: true })
  @Column({ comment: 'SHA-256 hash of the raw key — never store plaintext' })
  keyHash: string;

  @Column({ comment: 'First 8 chars of the key so users can identify it' })
  keyPrefix: string;

  @Column()
  workspaceId: string;

  @Column({
    type: 'enum',
    enum: ['read-only', 'read-write'],
    default: 'read-only',
    comment: 'Scope for the api key',
  })
  scope: 'read-only' | 'read-write';

  @Column({ type: 'timestamp', nullable: true, comment: 'Last time this key was used' })
  lastUsedAt?: Date;

  @ManyToOne(() => Workspace, (w: Workspace) => w.apiKeys, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Workspace;

  /**
   * Expiry timestamp for the API key. Nullable; if null, key does not expire.
   * Ensure DB migration adds this column with: expires_at TIMESTAMP NULL
   */
  @Column({ nullable: true, comment: 'Expiry timestamp for the API key. If null, does not expire.' })
  expiresAt?: Date;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
// validated: keyHash uniqueness enforced at DB level
