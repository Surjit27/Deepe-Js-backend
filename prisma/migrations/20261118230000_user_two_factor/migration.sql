-- AlterTable
ALTER TABLE "users" ADD COLUMN "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "totp_secret_cipher" TEXT NOT NULL DEFAULT '';

-- Down (manual rollback):
-- ALTER TABLE "users" DROP COLUMN "totp_secret_cipher";
-- ALTER TABLE "users" DROP COLUMN "two_factor_enabled";