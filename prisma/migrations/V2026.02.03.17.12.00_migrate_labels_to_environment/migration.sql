-- Migration: Migrate labels from board-scoped to environment-scoped
-- This migration changes labels to belong to environments instead of boards

-- Step 1: Add environment_id column to labels table
ALTER TABLE `labels` ADD COLUMN `environment_id` VARCHAR(191);

-- Step 2: Populate environment_id from boards.environment_id via labels.board_id
UPDATE `labels` 
SET `environment_id` = (
    SELECT `environment_id` 
    FROM `boards` 
    WHERE `boards`.`id` = `labels`.`board_id`
);

-- Step 3: Make environment_id NOT NULL (all labels should now have an environment_id)
ALTER TABLE `labels` MODIFY COLUMN `environment_id` VARCHAR(191) NOT NULL;

-- Step 4: Drop the foreign key constraint on board_id
ALTER TABLE `labels` DROP FOREIGN KEY `labels_board_id_fkey`;

-- Step 5: Drop the board_id column
ALTER TABLE `labels` DROP COLUMN `board_id`;

-- Step 6: Add foreign key constraint on environment_id
ALTER TABLE `labels` ADD CONSTRAINT `labels_environment_id_fkey` 
    FOREIGN KEY (`environment_id`) REFERENCES `environments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 7: Create index on environment_id for better query performance
CREATE INDEX `labels_environment_id_idx` ON `labels`(`environment_id`);
