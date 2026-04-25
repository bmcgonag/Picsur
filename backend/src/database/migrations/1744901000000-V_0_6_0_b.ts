import { MigrationInterface, QueryRunner } from 'typeorm';

export class VUserEmail1744901000000 implements MigrationInterface {
  name = 'VUserEmail1744901000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // This migration ensures email column exists even if previous migration failed
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
  }
}
