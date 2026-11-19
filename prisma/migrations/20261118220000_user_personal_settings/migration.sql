-- AlterTable
ALTER TABLE "users" ADD COLUMN "personal_settings" JSONB NOT NULL DEFAULT '{}';

-- Down (manual rollback):
-- ALTER TABLE "users" DROP COLUMN "personal_settings";