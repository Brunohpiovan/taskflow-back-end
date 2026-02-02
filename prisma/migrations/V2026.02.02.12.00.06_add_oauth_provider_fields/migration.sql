-- AlterTable
ALTER TABLE `users` ADD COLUMN `provider` VARCHAR(191) NULL,
    ADD COLUMN `provider_id` VARCHAR(191) NULL,
    MODIFY COLUMN `password_hash` VARCHAR(191) NULL;
