--
-- Adds the at-rest encryption envelope to blocks: `encryptionKeyId` names the key that sealed
-- `data`, and `iv` is the GCM nonce used. Both are NULL on plaintext blocks, so existing rows and
-- unencrypted stores are unaffected.
--
-- Not idempotent, by design: `feed_migrations` guarantees it runs exactly once. Immutable once
-- shipped — change the schema by adding the next numbered migration.
--
-- AlterTable
ALTER TABLE "blocks" ADD COLUMN "encryptionKeyId" TEXT;

-- AlterTable
ALTER TABLE "blocks" ADD COLUMN "iv" BLOB;
