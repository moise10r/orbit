export class AddResetTokenFieldsToUser1718040000000 {
  async up(queryRunner) {
    await queryRunner.addColumn('users', {
      name: 'resetTokenHash',
      type: 'varchar',
      isNullable: true,
    });
    await queryRunner.addColumn('users', {
      name: 'resetTokenExpiresAt',
      type: 'timestamptz',
      isNullable: true,
    });
  }

  async down(queryRunner) {
    await queryRunner.dropColumn('users', 'resetTokenExpiresAt');
    await queryRunner.dropColumn('users', 'resetTokenHash');
  }
}
