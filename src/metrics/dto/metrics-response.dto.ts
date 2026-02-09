export class MetricsResponseDto {
    // Métricas Gerais
    totalEnvironments: number;
    totalBoards: number;
    totalCards: number;
    completionRate: number; // Percentual 0-100

    // Métricas de Produtividade
    cardsCreatedLast7Days: number;
    cardsCompletedLast7Days: number;
    overdueTasks: number;
    tasksDueSoon: number; // Próximos 3 dias

    // Métricas de Atividade
    totalComments: number;
    recentActivity: ActivityItem[];

    // Distribuição
    cardsByBoard: BoardMetric[];
    cardsByLabel: LabelMetric[];
}

export class ActivityItem {
    id: string;
    action: string;
    details: string | null;
    createdAt: Date;
    cardTitle?: string;
}

export class BoardMetric {
    boardId: string;
    boardName: string;
    cardCount: number;
}

export class LabelMetric {
    labelId: string;
    labelName: string;
    labelColor: string;
    cardCount: number;
}
