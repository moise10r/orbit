import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn
} from 'typeorm';
import { WebhookEndpoint } from './webhook-endpoint.entity';

export enum DeliveryStatus {
  Pending = 'pending',
  Success = 'success',
  Failed = 'failed',
}

@Entity('webhook_deliveries')
export class WebhookDelivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  endpointId: string;

  @ManyToOne(() => WebhookEndpoint, { eager: false })
  @JoinColumn({ name: 'endpointId' })
  endpoint: WebhookEndpoint;

  @Column('jsonb')
  payload: any;

  @Column({
    type: 'enum',
    enum: DeliveryStatus,
    default: DeliveryStatus.Pending,
  })
  status: DeliveryStatus;

  @Column({ nullable: true })
  responseCode: number;

  @Column({ nullable: true })
  responseBody: string;

  @Column({ default: 0 })
  retries: number;

  @Column({ nullable: true })
  error: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
