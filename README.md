# SIRIUS WEB API

API REST para o sistema SIRIUS WEB - ERP Multi-Tenant com emissão de NFCe.

## 🚀 Tecnologias

- Node.js 18+
- Express.js
- PostgreSQL (Supabase)
- JWT (Autenticação)
- Bcrypt (Hash de senhas)

## 📋 Pré-requisitos

- Node.js 18 ou superior
- Conta no Supabase com banco de dados criado
- Git (para deploy no Vercel)

## 🔧 Instalação Local

### 1. Clone o repositório

```bash
git clone https://github.com/SEU_USUARIO/sirius-web-api.git
cd sirius-web-api
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais:

```env
# Supabase - Connection String
DATABASE_URL=postgresql://postgres:SUA_SENHA@SEU_HOST.supabase.co:5432/postgres

# JWT Secret (gere uma chave aleatória forte)
JWT_SECRET=sua_chave_super_secreta_aqui

# Porta do servidor
PORT=3000

# Ambiente
NODE_ENV=development

# Token expiration
JWT_EXPIRES_IN=7d
```

**Como obter a DATABASE_URL:**
1. Acesse https://supabase.com/dashboard
2. Entre no seu projeto
3. Vá em: **Settings > Database**
4. Copie a **Connection string** (formato URI)
5. Substitua `[YOUR-PASSWORD]` pela sua senha

**Como gerar JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. Inicie o servidor

**Modo desenvolvimento (com auto-reload):**
```bash
npm run dev
```

**Modo produção:**
```bash
npm start
```

O servidor estará rodando em: `http://localhost:3000`

## 📚 Documentação da API

### Autenticação

#### POST /auth/register
Cadastrar nova empresa + primeiro usuário (plano FREE)

**Body:**
```json
{
  "nome": "João",
  "sobrenome": "Silva",
  "email": "joao@exemplo.com",
  "senha": "senha123",
  "celular": "11999999999",
  "razao_social": "Empresa Exemplo Ltda",
  "nome_fantasia": "Empresa Exemplo",
  "cnpj": "12345678901234",
  "logradouro_tipo": "Rua",
  "logradouro": "Exemplo",
  "numero": "123",
  "complemento": "Sala 1",
  "bairro": "Centro",
  "municipio": "São Paulo",
  "uf": "SP",
  "cep": "01234567",
  "telefone": "1133334444",
  "email_empresa": "contato@exemplo.com"
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Cadastro realizado com sucesso!",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "usuario": {
      "id": 1,
      "nome": "João",
      "sobrenome": "Silva",
      "email": "joao@exemplo.com"
    },
    "empresa": {
      "id": 1,
      "razao_social": "Empresa Exemplo Ltda",
      "nome_fantasia": "Empresa Exemplo",
      "cnpj": "12345678901234",
      "plano": "FREE"
    }
  }
}
```

#### POST /auth/login
Login do usuário

**Body:**
```json
{
  "email": "joao@exemplo.com",
  "senha": "senha123"
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Login realizado com sucesso!",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "usuario": {
      "id": 1,
      "nome": "João",
      "sobrenome": "Silva",
      "email": "joao@exemplo.com",
      "celular": "11999999999"
    },
    "empresas": [
      {
        "id": 1,
        "razao_social": "Empresa Exemplo Ltda",
        "nome_fantasia": "Empresa Exemplo",
        "cnpj": "12345678901234",
        "plano": "FREE",
        "is_admin": true
      }
    ]
  }
}
```

#### GET /auth/me
Retorna dados do usuário logado

**Headers:**
```
Authorization: Bearer <token>
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "usuario": {
      "id": 1,
      "nome": "João",
      "sobrenome": "Silva",
      "email": "joao@exemplo.com",
      "celular": "11999999999",
      "status": "A",
      "email_verificado": false,
      "membro_desde": "2026-01-04T12:00:00.000Z"
    },
    "empresas": [...]
  }
}
```

### Empresas

#### GET /empresas
Lista todas as empresas do usuário

**Headers:**
```
Authorization: Bearer <token>
```

#### GET /empresas/:id
Busca dados de uma empresa específica

**Headers:**
```
Authorization: Bearer <token>
```

#### PUT /empresas/:id
Atualiza dados da empresa (apenas admin)

**Headers:**
```
Authorization: Bearer <token>
```

**Body:** (todos os campos opcionais)
```json
{
  "razao_social": "Nova Razão Social",
  "nome_fantasia": "Novo Nome Fantasia",
  "logradouro": "Nova Rua",
  "numero": "456"
}
```

## 🔒 Segurança

- Senhas são hasheadas com bcrypt (10 rounds)
- Autenticação via JWT
- Row Level Security (RLS) no PostgreSQL
- Tokens expiram após 7 dias (configurável)
- CORS configurável

## 🧪 Testando a API

### Usando cURL

**Health check:**
```bash
curl http://localhost:3000/
```

**Registrar:**
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "João",
    "sobrenome": "Silva",
    "email": "joao@teste.com",
    "senha": "senha123",
    "celular": "11999999999",
    "razao_social": "Teste Ltda",
    "nome_fantasia": "Teste",
    "cnpj": "12345678901234",
    "logradouro": "Rua Teste",
    "numero": "123",
    "bairro": "Centro",
    "uf": "SP",
    "cep": "01234567",
    "telefone": "1133334444",
    "email_empresa": "contato@teste.com"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao@teste.com",
    "senha": "senha123"
  }'
```

## 📦 Estrutura de Pastas

```
sirius-web-api/
├── src/
│   ├── config/
│   │   └── database.js       # Configuração PostgreSQL
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   └── empresas.controller.js
│   ├── middlewares/
│   │   ├── auth.middleware.js
│   │   └── tenant.middleware.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   └── empresas.routes.js
│   ├── app.js                # Aplicação Express
│   └── server.js             # Inicialização do servidor
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## 🚀 Deploy no Vercel

Ver arquivo: `DEPLOY.md`

## 📝 Licença

ISC

## 👨‍💻 Autor

Adonis - SIRIUS WEB
