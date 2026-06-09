import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('webhook_deliveries')
export class WebhookDelivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  endpointId: string;

  @Column()
  status: 'pending' | 'delivered' | 'failed';

  @Column({ nullable: true })
  responseCode?: number;

  @Column({ type: 'json' })
  payload: Record<string, any>;

  @Column({ default: 0 })
  retries: number;

  @Column({ nullable: true })
  errorMessage?: string;

  @CreateDateColumn()
  createdAt: Date;
}
// Migration for webhook_deliveries table is required for correctness.
