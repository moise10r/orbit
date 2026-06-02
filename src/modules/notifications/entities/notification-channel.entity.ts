import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export type ChannelType = 'slack' | 'email';
export type NotificationEvent =
  | 'deployment.started'
  | 'deployment.success'
  | 'deployment.failed'
  | 'release.rolled_back'
  | 'release.created';

@Entity('notification_channels')
export class NotificationChannel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workspaceId: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: ['slack', 'email'] })
  type: ChannelType;

  @Column({ type: 'jsonb', comment: 'slack: { webhookUrl }, email: { addresses: [] }' })
  config: Record<string, unknown>;

  @Column({
    type: 'simple-array',
    default: 'deployment.failed,release.rolled_back',
  })
  events: string[];

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// per-workspace quiet hours: { start: '22:00', end: '08:00', timezone: 'UTC' }
