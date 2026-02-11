<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
  <img src="https://upload.wikimedia.org/wikipedia/en/d/dd/MySQL_logo.svg" width="120" alt="MySQL Logo" style="margin-left: 20px;" />
</p>

# TaskFlow - Backend

Backend API for TaskFlow, a Trello-like application for personal task organization. Built with NestJS and MySQL.

## 🚀 Tech Stack

- **Framework:** [NestJS](https://nestjs.com/)
- **Database:** MySQL
- **ORM:** [Prisma](https://www.prisma.io/)
- **Authentication:** JWT, Passport (Google & GitHub OAuth)
- **Real-time:** Socket.io
- **Storage:** AWS S3 (Attachments)
- **Email:** Resend
- **Documentation:** Swagger UI

## 🛠️ Project Setup

### Prerequisites

- Node.js (v18+)
- MySQL Database

### Installation

```bash
$ npm install
```

### Environment Variables

Create a `.env` file in the root directory and configure the following:

```env
# Server
PORT=3001
API_PREFIX=api
CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3001

# Database (MySQL)
DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE"

# Auth (JWT)
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# OAuth (Optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# AWS S3 (Attachments)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_BUCKET_NAME=

# Email (Resend)
RESEND_API_KEY=
```

### Database Setup

Run migrations to create database schema:

```bash
$ npx prisma migrate deploy
```

## 🏃‍♂️ Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

API Documentation (Swagger) available at: `http://localhost:3001/api/docs`

## 🧪 Tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## 🚢 Deployment (Render)

This project is configured for deployment on Render.
- **Build Command:** `npm install && npx prisma generate && npm run build`
- **Start Command:** `npm run start:prod` (Automatically runs migrations)

## 📄 License

Nest is [MIT licensed](LICENSE).
