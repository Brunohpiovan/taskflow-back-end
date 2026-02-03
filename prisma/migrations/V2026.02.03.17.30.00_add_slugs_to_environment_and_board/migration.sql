-- Migration: Add slugs to Environment and Board models
-- This migration adds slug fields for SEO-friendly URLs

-- Step 1: Add slug column to environments table
ALTER TABLE `environments` ADD COLUMN `slug` VARCHAR(191);

-- Step 2: Generate simple slugs for existing environments based on name
UPDATE `environments` 
SET `slug` = CONCAT(
    LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        TRIM(name),
        ' ', '-'),
        'ã', 'a'),
        'á', 'a'),
        'é', 'e'),
        'ç', 'c'
    )),
    '-',
    SUBSTRING(id, 1, 8)
);

-- Step 3: Make slug NOT NULL and UNIQUE
ALTER TABLE `environments` MODIFY COLUMN `slug` VARCHAR(191) NOT NULL;
CREATE UNIQUE INDEX `environments_slug_key` ON `environments`(`slug`);

-- Step 4: Add slug column to boards table
ALTER TABLE `boards` ADD COLUMN `slug` VARCHAR(191);

-- Step 5: Generate simple slugs for existing boards based on name
UPDATE `boards` 
SET `slug` = CONCAT(
    LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        TRIM(name),
        ' ', '-'),
        'ã', 'a'),
        'á', 'a'),
        'é', 'e'),
        'ç', 'c'
    )),
    '-',
    SUBSTRING(id, 1, 8)
);

-- Step 6: Make slug NOT NULL
ALTER TABLE `boards` MODIFY COLUMN `slug` VARCHAR(191) NOT NULL;

-- Step 7: Create unique constraint on environment_id + slug
CREATE UNIQUE INDEX `boards_environment_id_slug_key` ON `boards`(`environment_id`, `slug`);
