import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
} from 'typeorm';

@Entity('notification_logs')
export class NotificationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workspaceId: string;

  @Column()
  channelId: string;

  @Column()
  event: string;

  @Column({ comment: 'Idempotency key — prevents duplicate sends on retry' })
  idempotencyKey: string;

  @Column({ default: false })
  success: boolean;

  @Column({ nullable: true })
  errorMessage?: string;

  @CreateDateColumn()
  sentAt: Date;
}
