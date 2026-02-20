-- Migration: V2026.02.20.01.09.00_add_card_board_position_indexes
-- Adiciona índices compostos de performance nos cards por board e posição

-- Card model
CREATE INDEX `cards_board_id_position_idx` ON `cards`(`board_id`, `position`);
