import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateWebhookTables1682341345123 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'webhook_endpoints',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, isGenerated: true, generationStrategy: 'uuid' },
          { name: 'workspaceId', type: 'uuid', isNullable: false },
          { name: 'url', type: 'text' },
          { name: 'secret', type: 'text' },
          { name: 'events', type: 'text', isArray: true },
          { name: 'active', type: 'boolean', default: 'true' },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
        ],
      }),
    );
    await queryRunner.createTable(
      new Table({
        name: 'webhook_deliveries',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, isGenerated: true, generationStrategy: 'uuid' },
          { name: 'endpointId', type: 'uuid', isNullable: false },
          { name: 'status', type: "varchar", length: "15" },
          { name: 'responseCode', type: 'integer', isNullable: true },
          { name: 'payload', type: 'json' },
          { name: 'retries', type: 'integer', default: 0 },
          { name: 'errorMessage', type: 'text', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
        ],
      }),
    );
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('webhook_deliveries');
    await queryRunner.dropTable('webhook_endpoints');
  }
}
