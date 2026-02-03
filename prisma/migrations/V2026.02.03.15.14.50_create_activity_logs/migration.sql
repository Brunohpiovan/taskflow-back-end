-- CreateTable
CREATE TABLE `activity_logs` (
    `id` VARCHAR(191) NOT NULL,
    `card_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `details` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `activity_logs` ADD CONSTRAINT `activity_logs_card_id_fkey` FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `activity_logs` ADD CONSTRAINT `activity_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
