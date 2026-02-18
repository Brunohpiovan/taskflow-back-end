const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const indexes = [
    // User model
    'CREATE INDEX `users_email_idx` ON `users`(`email`)',
    'CREATE INDEX `users_provider_providerId_idx` ON `users`(`provider`, `provider_id`)',

    // Environment model
    'CREATE INDEX `environments_user_id_idx` ON `environments`(`user_id`)',
    'CREATE INDEX `environments_slug_idx` ON `environments`(`slug`)',

    // Board model
    'CREATE INDEX `boards_environment_id_idx` ON `boards`(`environment_id`)',

    // Card model
    'CREATE INDEX `cards_board_id_idx` ON `cards`(`board_id`)',
    'CREATE INDEX `cards_due_date_idx` ON `cards`(`due_date`)',

    // Label model
    'CREATE INDEX `labels_environment_id_idx` ON `labels`(`environment_id`)',

    // Comment model
    'CREATE INDEX `comments_card_id_idx` ON `comments`(`card_id`)',
    'CREATE INDEX `comments_user_id_idx` ON `comments`(`user_id`)',

    // Attachment model
    'CREATE INDEX `attachments_comment_id_idx` ON `attachments`(`comment_id`)',

    // ActivityLog model
    'CREATE INDEX `activity_logs_card_id_idx` ON `activity_logs`(`card_id`)',
    'CREATE INDEX `activity_logs_user_id_idx` ON `activity_logs`(`user_id`)',
    'CREATE INDEX `activity_logs_created_at_idx` ON `activity_logs`(`created_at`)',

    // EnvironmentMember model
    'CREATE INDEX `environment_members_environment_id_idx` ON `environment_members`(`environment_id`)',
    'CREATE INDEX `environment_members_user_id_idx` ON `environment_members`(`user_id`)',

    // Invite model
    'CREATE INDEX `invites_environment_id_idx` ON `invites`(`environment_id`)',

    // CardMember model
    'CREATE INDEX `card_members_card_id_idx` ON `card_members`(`card_id`)',
    'CREATE INDEX `card_members_user_id_idx` ON `card_members`(`user_id`)',
];

async function applyIndexes() {
    console.log('🚀 Aplicando índices de performance...\n');

    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const sql of indexes) {
        const indexName = sql.match(/`([^`]+_idx)`/)[1];
        try {
            await prisma.$executeRawUnsafe(sql);
            console.log(`✅ Criado: ${indexName}`);
            created++;
        } catch (error) {
            if (error.code === 'ER_DUP_KEYNAME' || error.message.includes('Duplicate key name')) {
                console.log(`⏭️  Já existe: ${indexName}`);
                skipped++;
            } else {
                console.error(`❌ Erro ao criar ${indexName}:`, error.message);
                failed++;
            }
        }
    }

    console.log('\n📊 Resumo:');
    console.log(`   ✅ Criados: ${created}`);
    console.log(`   ⏭️  Já existiam: ${skipped}`);
    console.log(`   ❌ Falhas: ${failed}`);
    console.log(`   📝 Total: ${indexes.length}`);

    await prisma.$disconnect();

    if (failed > 0) {
        process.exit(1);
    }
}

applyIndexes()
    .catch((error) => {
        console.error('❌ Erro fatal:', error);
        process.exit(1);
    });
