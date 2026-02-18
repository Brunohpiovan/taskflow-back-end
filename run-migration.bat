@echo off
REM Script para executar a migration do Prisma
REM Este script deve ser executado manualmente no terminal

echo ========================================
echo Executando Migration do Prisma
echo ========================================
echo.
echo Migration: V2026.02.17.22.55.00_add_performance_indexes
echo Descricao: Adiciona indices de performance ao banco de dados
echo.
echo IMPORTANTE: Esta migration e NAO-DESTRUTIVA
echo - Apenas adiciona indices
echo - Nao altera dados existentes
echo - Nao remove colunas ou tabelas
echo.
echo ========================================
echo.

cd /d "%~dp0"
npx prisma migrate dev --name V2026.02.17.22.55.00_add_performance_indexes

echo.
echo ========================================
echo Migration concluida!
echo ========================================
echo.
echo Proximos passos:
echo 1. Verificar que a migration foi criada em prisma/migrations/
echo 2. Reiniciar o backend (Ctrl+C e npm run start:dev)
echo 3. Testar a aplicacao
echo.
pause
