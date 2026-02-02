# Configuração OAuth (Google e GitHub) – passo a passo

Este guia explica como obter as credenciais e preencher o `.env` do backend.

---

## 1. URLs no `.env` (já configuradas para desenvolvimento)

No seu `backend/.env` já devem estar:

```env
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3001
```

- **FRONTEND_URL**: URL em que o front Next.js roda (onde o usuário volta após login).
- **BACKEND_URL**: URL em que o backend NestJS roda (usada nos callbacks OAuth).

Em produção, troque por suas URLs reais (ex.: `https://meuapp.com` e `https://api.meuapp.com`).

---

## 2. Google OAuth

### 2.1. Acessar o Google Cloud Console

1. Abra: **https://console.cloud.google.com/**
2. Faça login com sua conta Google.
3. No topo, clique no **seletor de projeto** (nome do projeto atual).
4. Clique em **“Novo projeto”**, dê um nome (ex.: `TaskFlow`) e clique em **Criar**.
5. Selecione esse projeto no seletor.

### 2.2. Ativar a tela de consentimento OAuth (se ainda não existir)

1. No menu lateral: **APIs e serviços** → **Tela de consentimento OAuth**.
2. Se pedir tipo de usuário, escolha **Externo** (para qualquer conta Google) e **Criar**.
3. Preencha:
   - **Nome do app**: ex. `TaskFlow`
   - **E-mail de suporte do usuário**: seu e-mail
   - **Domínios autorizados**: em desenvolvimento deixe em branco; em produção coloque seu domínio.
4. Clique em **Salvar e continuar** até concluir (escopos e usuários de teste podem ser deixados em padrão).

### 2.3. Criar credenciais OAuth 2.0

1. No menu: **APIs e serviços** → **Credenciais**.
2. Clique em **+ Criar credenciais** → **ID do cliente OAuth**.
3. **Tipo de aplicativo**: **Aplicativo da Web**.
4. **Nome**: ex. `TaskFlow Web`.
5. Em **URIs de redirecionamento autorizados**, clique em **+ Adicionar URI** e coloque exatamente:
   ```text
   http://localhost:3001/api/auth/google/callback
   ```
   Se usar outra porta ou domínio, use: `{BACKEND_URL}/api/auth/google/callback`.
6. Clique em **Criar**.
7. Na tela que abrir, copie:
   - **ID do cliente** → será o `GOOGLE_CLIENT_ID`
   - **Segredo do cliente** → será o `GOOGLE_CLIENT_SECRET` (você pode clicar em “Mostrar” para ver).

### 2.4. Colar no `.env`

No arquivo `backend/.env`:

```env
GOOGLE_CLIENT_ID=seu-id-do-google.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-segredo-do-google
```

Substitua pelos valores que você copiou. Salve o arquivo (sem compartilhar o `.env` em repositório).

---

## 3. GitHub OAuth

### 3.1. Acessar as configurações de desenvolvedor

1. Abra: **https://github.com/settings/developers**
2. Faça login no GitHub.
3. Em **OAuth Apps**, clique em **New OAuth App** (ou “Registrar novo aplicativo OAuth”).

### 3.2. Preencher o aplicativo OAuth

1. **Application name**: ex. `TaskFlow`.
2. **Homepage URL**: em desenvolvimento pode ser:
   ```text
   http://localhost:3000
   ```
   (mesmo valor do frontend).
3. **Authorization callback URL** (obrigatório): use exatamente:
   ```text
   http://localhost:3001/api/auth/github/callback
   ```
   Em produção: `https://sua-api.com/api/auth/github/callback`.
4. Clique em **Register application**.

### 3.3. Gerar o Client Secret

1. Na página do app criado, em **Client ID** está o valor que você vai usar em `GITHUB_CLIENT_ID`.
2. Em **Client secrets**, clique em **Generate a new client secret**.
3. Confirme com sua senha do GitHub se pedido.
4. **Copie o valor do secret imediatamente** (ele só aparece uma vez). Esse é o `GITHUB_CLIENT_SECRET`.

### 3.4. Colar no `.env`

No `backend/.env`:

```env
GITHUB_CLIENT_ID=seu-client-id-do-github
GITHUB_CLIENT_SECRET=o-segredo-que-voce-gerou
```

Substitua pelos valores reais e salve.

---

## 4. Conferir o `.env`

O trecho relevante do `backend/.env` deve ficar assim (com seus valores no lugar dos placeholders):

```env
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3001

GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx

GITHUB_CLIENT_ID=Ov23lixxxxx
GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

- Nunca commite o `.env` (ele já deve estar no `.gitignore`).
- Em produção, use variáveis de ambiente do servidor ou um gerenciador de segredos.

---

## 5. Testar

1. Reinicie o backend (para carregar as novas variáveis).
2. No frontend, acesse a tela de login.
3. Clique em **Google** ou **GitHub**.
4. Você deve ser redirecionado para o provedor, autorizar e voltar ao app já logado.

Se der erro 302 ou “redirect_uri mismatch”:

- **Google**: confira se o URI em “URIs de redirecionamento autorizados” é exatamente `http://localhost:3001/api/auth/google/callback` (incluindo `/api`).
- **GitHub**: confira se “Authorization callback URL” é exatamente `http://localhost:3001/api/auth/github/callback`.

---

## Resumo rápido

| Onde | O que fazer |
|------|-------------|
| **Google Cloud Console** | Criar projeto → Tela de consentimento → Credenciais → OAuth 2.0 (Web) → Redirect URI = `http://localhost:3001/api/auth/google/callback` |
| **GitHub** | Settings → Developer settings → OAuth Apps → New → Callback URL = `http://localhost:3001/api/auth/github/callback` → Gerar client secret |
| **backend/.env** | Preencher `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` (e manter `FRONTEND_URL` e `BACKEND_URL`) |

Depois disso, o login com Google e GitHub estará configurado passo a passo conforme este guia.
