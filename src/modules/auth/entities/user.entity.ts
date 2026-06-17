import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Workspace } from './workspace.entity';

export type UserRole = 'owner' | 'admin' | 'member' | 'viewer';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ select: false })
  passwordHash: string;

  @Column({ nullable: true })
  resetTokenHash?: string;

  @Column({ type: 'timestamptz', nullable: true })
  resetTokenExpiresAt?: Date;

  @Column({ type: 'enum', enum: ['owner', 'admin', 'member', 'viewer'], default: 'member' })
  role: UserRole;

  @Column({ nullable: true })
  avatarUrl?: string;

  @Column({ default: false })
  emailVerified: boolean;

  @Column({ nullable: true, select: false })
  refreshTokenHash?: string;

  @Column({ nullable: true })
  workspaceId?: string;

  @ManyToOne(() => Workspace, (w) => w.members, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'workspaceId' })
  workspace?: Workspace;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// Migration required to add resetTokenHash (string, nullable) and resetTokenExpiresAt (timestamptz, nullable) to users table
