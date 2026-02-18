-- Migration: V2026.02.17.23.00.00_add_performance_indexes
-- Adiciona índices de performance (com verificação de existência)

-- User model
CREATE INDEX IF NOT EXISTS `users_email_idx` ON `users`(`email`);
CREATE INDEX IF NOT EXISTS `users_provider_providerId_idx` ON `users`(`provider`, `provider_id`);

-- Environment model  
CREATE INDEX IF NOT EXISTS `environments_user_id_idx` ON `environments`(`user_id`);
CREATE INDEX IF NOT EXISTS `environments_slug_idx` ON `environments`(`slug`);

-- Board model
CREATE INDEX IF NOT EXISTS `boards_environment_id_idx` ON `boards`(`environment_id`);

-- Card model
CREATE INDEX IF NOT EXISTS `cards_board_id_idx` ON `cards`(`board_id`);
CREATE INDEX IF NOT EXISTS `cards_due_date_idx` ON `cards`(`due_date`);

-- Label model
CREATE INDEX IF NOT EXISTS `labels_environment_id_idx` ON `labels`(`environment_id`);

-- Comment model
CREATE INDEX IF NOT EXISTS `comments_card_id_idx` ON `comments`(`card_id`);
CREATE INDEX IF NOT EXISTS `comments_user_id_idx` ON `comments`(`user_id`);

-- Attachment model
CREATE INDEX IF NOT EXISTS `attachments_comment_id_idx` ON `attachments`(`comment_id`);

-- ActivityLog model
CREATE INDEX IF NOT EXISTS `activity_logs_card_id_idx` ON `activity_logs`(`card_id`);
CREATE INDEX IF NOT EXISTS `activity_logs_user_id_idx` ON `activity_logs`(`user_id`);
CREATE INDEX IF NOT EXISTS `activity_logs_created_at_idx` ON `activity_logs`(`created_at`);

-- EnvironmentMember model
CREATE INDEX IF NOT EXISTS `environment_members_environment_id_idx` ON `environment_members`(`environment_id`);
CREATE INDEX IF NOT EXISTS `environment_members_user_id_idx` ON `environment_members`(`user_id`);

-- Invite model
CREATE INDEX IF NOT EXISTS `invites_environment_id_idx` ON `invites`(`environment_id`);

-- CardMember model
CREATE INDEX IF NOT EXISTS `card_members_card_id_idx` ON `card_members`(`card_id`);
CREATE INDEX IF NOT EXISTS `card_members_user_id_idx` ON `card_members`(`user_id`);
