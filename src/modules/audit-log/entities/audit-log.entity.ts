import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export type AuditAction =
  | 'MEMBER_REMOVED'
  | 'PROJECT_DELETED'
  | 'API_KEY_CREATED'
  | 'API_KEY_REVOKED'
  | 'PLAN_CHANGED';

@Entity({ name: 'audit_logs' })
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workspaceId: string;

  @Column({ nullable: true })
  projectId?: string;

  @Column()
  actorId: string;

  @Column({ type: 'varchar' })
  action: AuditAction;

  @Column()
  targetType: string;

  @Column()
  targetId: string;

  @Column()
  ipAddress: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
