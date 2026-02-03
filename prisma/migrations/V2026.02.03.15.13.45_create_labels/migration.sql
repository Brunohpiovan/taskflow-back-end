/*
  Warnings:

  - You are about to drop the column `labels` on the `cards` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `cards` DROP COLUMN `labels`;

-- CreateTable
CREATE TABLE `labels` (
    `id` VARCHAR(191) NOT NULL,
    `board_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_CardToLabel` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_CardToLabel_AB_unique`(`A`, `B`),
    INDEX `_CardToLabel_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `labels` ADD CONSTRAINT `labels_board_id_fkey` FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CardToLabel` ADD CONSTRAINT `_CardToLabel_A_fkey` FOREIGN KEY (`A`) REFERENCES `cards`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CardToLabel` ADD CONSTRAINT `_CardToLabel_B_fkey` FOREIGN KEY (`B`) REFERENCES `labels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
