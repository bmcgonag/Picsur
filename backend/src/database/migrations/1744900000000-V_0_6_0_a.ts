import { MigrationInterface, QueryRunner } from 'typeorm';

export class VOidc060A1744900000000 implements MigrationInterface {
  name = 'VOidc060A1744900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add external_id column if it doesn't exist (for fresh installs or partial previous runs)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'e_user_backend' AND column_name = 'external_id'
        ) THEN
          ALTER TABLE "e_user_backend" ADD "external_id" character varying;
        END IF;
      END $$
    `);

    // Create index for external_id
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_e_user_backend_external_id" 
      ON "e_user_backend" ("external_id") WHERE "external_id" IS NOT NULL
    `);

    // Add email column if it doesn't exist
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'e_user_backend' AND column_name = 'email'
        ) THEN
          ALTER TABLE "e_user_backend" ADD "email" character varying;
        END IF;
      END $$
    `);

    // Create index for email
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_e_user_backend_email" 
      ON "e_user_backend" ("email") WHERE "email" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_e_user_backend_email"`,
    );
    await queryRunner.query(
      `ALTER TABLE "e_user_backend" DROP COLUMN IF EXISTS "email"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_e_user_backend_external_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "e_user_backend" DROP COLUMN IF EXISTS "external_id"`,
    );
  }
}
