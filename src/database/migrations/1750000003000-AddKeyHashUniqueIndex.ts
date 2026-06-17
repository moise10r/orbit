import { MigrationInterface, QueryRunner } from 'typeorm';

const KEYHASH_INDEX = 'UQ_api_keys_keyHash';

// CREATE INDEX CONCURRENTLY cannot run inside a transaction — do not wrap in startTransaction().
export class AddKeyHashUniqueIndex1750000003000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "${KEYHASH_INDEX}" ON "api_keys" ("keyHash");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "${KEYHASH_INDEX}";`);
  }
}
