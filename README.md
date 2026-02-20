<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="80" alt="Nest Logo" /></a>
  &nbsp;&nbsp;&nbsp;&nbsp;
  <img src="https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg" width="80" alt="React Logo" />
  &nbsp;&nbsp;&nbsp;&nbsp;
  <img src="https://upload.wikimedia.org/wikipedia/en/d/dd/MySQL_logo.svg" width="80" alt="MySQL Logo" />
</p>

<h1 align="center">TaskFlow</h1>
<p align="center">Gerenciamento de tarefas em tempo real com drag-and-drop, WebSockets e autenticação OAuth</p>

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-11-E0234E?style=flat-square&logo=nestjs" />
  <img src="https://img.shields.io/badge/Next.js-14-000000?style=flat-square&logo=nextdotjs" />
  <img src="https://img.shields.io/badge/Prisma-5-2D3748?style=flat-square&logo=prisma" />
  <img src="https://img.shields.io/badge/Socket.io-4-010101?style=flat-square&logo=socketdotio" />
  <img src="https://img.shields.io/badge/AWS_S3-Storage-FF9900?style=flat-square&logo=amazons3" />
</p>

---

## 🏗️ Arquitetura

```mermaid
graph TB
    FE["Next.js 14 Frontend<br/>(Vercel)"]
    BE["NestJS API<br/>(Render)"]
    DB[("MySQL Database")]
    S3["AWS S3<br/>(Attachments)"]
    Mail["Resend<br/>(Email)"]
    WS["Socket.io Gateway<br/>(Real-time)"]

    FE -->|"REST (JWT)"| BE
    FE <-->|"WebSocket Events"| WS
    WS --- BE
    BE --> DB
    BE --> S3
    BE --> Mail
```

**Fluxo de dados em tempo real:** Quando um usuário move um card, cria um comentário ou é adicionado a uma tarefa, o backend emite um evento via WebSocket para todos os participantes do ambiente — sem necessidade de polling.

---

## 🚀 Tech Stack

### Backend
| Tecnologia | Uso |
|-----------|-----|
| **NestJS 11** | Framework principal — módulos, DTOs, Guards |
| **Prisma 5** | ORM type-safe com migrations |
| **MySQL** | Banco de dados relacional |
| **JWT + Passport** | Autenticação stateless |
| **Google & GitHub OAuth** | Login social |
| **Socket.io** | Atualizações em tempo real |
| **AWS S3** | Upload e download de anexos |
| **Resend** | Envio de emails transacionais |
| **Swagger** | Documentação interativa da API |
| **Helmet + Throttler** | Segurança e rate limiting |
| **Jest** | Testes unitários com CI/CD |

### Frontend
| Tecnologia | Uso |
|-----------|-----|
| **Next.js 14** | App Router, SSR, middleware |
| **Zustand** | Gerenciamento de estado global |
| **DND Kit** | Drag-and-drop acessível |
| **Radix UI** | Componentes primitivos acessíveis |
| **React Hook Form + Zod** | Formulários com validação tipada |
| **TailwindCSS** | Estilos utilitários |
| **Socket.io-client** | Sincronização em tempo real |

---

## 🛠️ Setup Local

### Pré-requisitos
- Node.js v20+
- MySQL

### Backend

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env

# 3. Rodar migrations
npx prisma migrate deploy

# 4. Iniciar em modo desenvolvimento
npm run start:dev
```

API disponível em: `http://localhost:3001`  
Swagger UI: `http://localhost:3001/api/docs`  
Health check: `http://localhost:3001/api/health`

### Variáveis de Ambiente

```env
# Servidor
PORT=3001
API_PREFIX=api
CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE"

# Auth
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# OAuth (opcional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_BUCKET_NAME=

# Email
RESEND_API_KEY=
```

---

## 🧪 Testes

```bash
# Testes unitários
npm run test

# Cobertura
npm run test:cov

# Testes E2E
npm run test:e2e
```

O CI/CD roda automaticamente via **GitHub Actions** em cada push/PR para `main` e `develop`.

---

## 🔑 Funcionalidades

- **Autenticação:** Login/registro com email, Google OAuth e GitHub OAuth
- **Ambientes:** Espaços de trabalho colaborativos com convite por email
- **Boards & Cards:** Kanban com drag-and-drop entre colunas
- **Tempo real:** Movimentação de cards, comentários e membros sincronizados via WebSocket
- **Calendário:** Visualização de cards com prazo por data
- **Métricas:** Dashboard com estatísticas do ambiente
- **Anexos:** Upload de arquivos nos comentários via AWS S3
- **Activity Log:** Histórico de ações por card

---

## 🚢 Deploy (Render + Vercel)

**Backend (Render)**
- Build: `npm install && npx prisma generate && npm run build`
- Start: `npm run start:prod` _(roda migrations automaticamente antes de iniciar)_

**Frontend (Vercel)**
- Framework: Next.js (auto-detectado)
- Variável: `NEXT_PUBLIC_API_URL=https://sua-api.onrender.com`

---

## 📄 Licença

MIT
