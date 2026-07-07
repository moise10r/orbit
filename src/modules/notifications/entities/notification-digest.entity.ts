import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
} from 'typeorm';

@Entity('notification_digests')
export class NotificationDigest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workspaceId: string;

  @Column()
  channelId: string;

  @Column()
  event: string;

  @Column()
  releaseVersion: string;

  @Column()
  environment: string;

  @Column()
  triggeredBy: string;

  @Column({ nullable: true })
  details?: string;

  @Column({ default: false })
  flushed: boolean;

  @CreateDateColumn()
  createdAt: Date;
}