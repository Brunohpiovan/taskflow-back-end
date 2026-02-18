#!/bin/bash
# Script para executar a migration do Prisma
# Execute este script no Git Bash

echo "========================================"
echo "Executando Migration do Prisma"
echo "========================================"
echo ""
echo "Migration: V2026.02.17.22.58.00_add_performance_indexes"
echo "Descrição: Adiciona índices de performance ao banco de dados"
echo ""
echo "IMPORTANTE: Esta migration é NÃO-DESTRUTIVA"
echo "- Apenas adiciona índices"
echo "- Não altera dados existentes"
echo "- Não remove colunas ou tabelas"
echo ""
echo "========================================"
echo ""

# Navegar para o diretório do backend
cd "$(dirname "$0")"

# Executar a migration
npx prisma migrate dev --name V2026.02.17.22.58.00_add_performance_indexes

echo ""
echo "========================================"
echo "Migration concluída!"
echo "========================================"
echo ""
echo "Próximos passos:"
echo "1. Verificar que a migration foi criada em prisma/migrations/"
echo "2. Reiniciar o backend: npm run start:dev"
echo "3. Testar a aplicação"
echo ""
