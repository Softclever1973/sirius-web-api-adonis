# 🚀 GUIA COMPLETO: Deploy no GitHub + Vercel

## PARTE 1: Publicar no GitHub (10 minutos)

### Passo 1: Criar repositório no GitHub

1. **Acesse:** https://github.com
2. **Clique** no botão **"+"** (canto superior direito) → **"New repository"**
3. **Preencha:**
   - Repository name: `sirius-web-api`
   - Description: `API REST para SIRIUS WEB - ERP Multi-Tenant`
   - Visibilidade: **Private** (recomendado) ou Public
   - **NÃO** marque "Add a README file"
   - **NÃO** marque "Add .gitignore"
4. **Clique** em **"Create repository"**

### Passo 2: Preparar o projeto localmente

Abra o terminal na pasta do projeto e execute:

```bash
# 1. Navegar até a pasta do projeto
cd sirius-web-api

# 2. Criar arquivo .env (se ainda não criou)
cp .env.example .env

# 3. Editar .env com suas credenciais
# Use seu editor favorito (VS Code, Notepad++, etc)
# IMPORTANTE: NÃO commite o arquivo .env!

# 4. Inicializar Git
git init

# 5. Adicionar todos os arquivos
git add .

# 6. Fazer primeiro commit
git commit -m "Initial commit - SIRIUS WEB API"
```

### Passo 3: Conectar com GitHub e enviar código

**IMPORTANTE:** Substitua `SEU_USUARIO` pelo seu nome de usuário do GitHub!

```bash
# 1. Adicionar remote (substitua SEU_USUARIO)
git remote add origin https://github.com/SEU_USUARIO/sirius-web-api.git

# 2. Renomear branch para main (padrão GitHub)
git branch -M main

# 3. Enviar código para GitHub
git push -u origin main
```

**Se pedir usuário e senha:**
- **Usuário:** seu_email@github.com
- **Senha:** Use um **Personal Access Token** (não é sua senha do GitHub!)

**Como gerar Personal Access Token:**
1. GitHub → Settings (seu perfil) → Developer settings
2. Personal access tokens → Tokens (classic)
3. Generate new token (classic)
4. Marque: `repo` (todos)
5. Gerar e copiar o token (você só verá UMA VEZ!)

### Passo 4: Verificar no GitHub

1. Acesse: `https://github.com/SEU_USUARIO/sirius-web-api`
2. Confirme que todos os arquivos estão lá
3. **IMPORTANTE:** Verifique que o arquivo `.env` **NÃO** está lá (segurança!)

✅ **GitHub concluído!**

---

## PARTE 2: Deploy no Vercel (5 minutos)

### Passo 1: Acessar Vercel

1. **Acesse:** https://vercel.com
2. **Faça login** com sua conta do GitHub
   - Clique em **"Continue with GitHub"**
   - Autorize o Vercel a acessar seus repositórios

### Passo 2: Importar projeto

1. Na dashboard do Vercel, clique em **"Add New..."** → **"Project"**
2. **Procure** por `sirius-web-api` na lista
3. **Clique** em **"Import"**

### Passo 3: Configurar o projeto

**Na tela de configuração:**

1. **Project Name:** `sirius-web-api` (ou outro nome que preferir)

2. **Framework Preset:** Selecione **"Other"**

3. **Root Directory:** Deixe em branco (ou `.` se aparecer)

4. **Build and Output Settings:**
   - Build Command: (deixe em branco)
   - Output Directory: (deixe em branco)
   - Install Command: `npm install`

5. **Environment Variables** ← MAIS IMPORTANTE!
   
   Clique em **"Add Environment Variable"** e adicione:

   | NAME | VALUE |
   |------|-------|
   | `DATABASE_URL` | `postgresql://postgres:SUA_SENHA@SEU_HOST.supabase.co:5432/postgres` |
   | `JWT_SECRET` | Cole sua chave secreta aqui (resultado do comando crypto) |
   | `NODE_ENV` | `production` |
   | `JWT_EXPIRES_IN` | `7d` |

   **Como pegar cada valor:**
   - `DATABASE_URL`: Supabase → Settings → Database → Connection String (URI)
   - `JWT_SECRET`: Execute no terminal: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` e copie o resultado

6. **Clique** em **"Deploy"**

### Passo 4: Aguardar deploy (1-2 minutos)

- Vercel vai instalar dependências
- Buildar o projeto
- Você verá logs em tempo real

### Passo 5: Testar a API

Quando terminar, você verá:

```
✅ Deployment Ready
```

**URL da sua API:** `https://sirius-web-api-xxx.vercel.app`

**Teste no navegador:**
```
https://sirius-web-api-xxx.vercel.app/
```

Deve retornar:
```json
{
  "success": true,
  "message": "SIRIUS WEB API - Online",
  "version": "1.0.0",
  "timestamp": "..."
}
```

✅ **Vercel concluído!**

---

## PARTE 3: Testar Endpoints no Vercel

### Usando cURL (Terminal)

**1. Health Check:**
```bash
curl https://sirius-web-api-xxx.vercel.app/
```

**2. Registrar empresa:**
```bash
curl -X POST https://sirius-web-api-xxx.vercel.app/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Adonis",
    "sobrenome": "Silva",
    "email": "adonis@teste.com",
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

**3. Login:**
```bash
curl -X POST https://sirius-web-api-xxx.vercel.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "adonis@teste.com",
    "senha": "senha123"
  }'
```

### Usando Postman ou Insomnia

1. **Importe** a coleção (criar manualmente):
   - POST `https://sirius-web-api-xxx.vercel.app/auth/register`
   - POST `https://sirius-web-api-xxx.vercel.app/auth/login`
   - GET `https://sirius-web-api-xxx.vercel.app/auth/me`

2. **Configure** Headers:
   ```
   Content-Type: application/json
   ```

3. **Para rotas autenticadas**, adicione:
   ```
   Authorization: Bearer SEU_TOKEN_AQUI
   ```

---

## PARTE 4: Atualizações Futuras

### Quando fizer mudanças no código:

```bash
# 1. Adicionar mudanças
git add .

# 2. Commitar
git commit -m "Descrição da mudança"

# 3. Enviar para GitHub
git push

# 4. Vercel faz deploy AUTOMÁTICO! 🎉
```

O Vercel detecta mudanças no GitHub e faz deploy automaticamente!

---

## 🔧 Configurações Avançadas do Vercel

### Ver logs em tempo real:

1. Vercel Dashboard → Seu projeto
2. Clique em uma **Deployment**
3. Aba **"Function Logs"**

### Configurar domínio customizado:

1. Vercel Dashboard → Projeto → Settings
2. **Domains** → Add Domain
3. Digite seu domínio (ex: `api.seusite.com.br`)
4. Configure DNS conforme instruções

### Variáveis de ambiente (adicionar/editar):

1. Vercel Dashboard → Projeto → Settings
2. **Environment Variables**
3. Adicionar/Editar/Remover

**IMPORTANTE:** Após alterar variáveis, faça **Redeploy**:
- Deployments → Última deployment → **︙** (menu) → Redeploy

---

## ❌ Solução de Problemas Comuns

### Erro: "Failed to connect to database"

**Solução:**
1. Verifique se `DATABASE_URL` está correta no Vercel
2. Confirme que a senha do Supabase está certa
3. Verifique se o projeto Supabase está ativo

### Erro: "Module not found"

**Solução:**
1. Verifique se `package.json` tem todas as dependências
2. No Vercel: Settings → General → Node.js Version (usar 18.x ou 20.x)
3. Redeploy

### Erro: "Invalid token"

**Solução:**
- `JWT_SECRET` no Vercel deve ser exatamente igual ao do desenvolvimento
- Se mudou o secret, usuários precisam fazer login novamente

### Git pede senha toda hora

**Solução:**
```bash
# Usar SSH ao invés de HTTPS
git remote set-url origin git@github.com:SEU_USUARIO/sirius-web-api.git
```

Ou configurar credential helper:
```bash
git config --global credential.helper cache
```

---

## 📋 Checklist Final

Antes de considerar concluído:

- [ ] Código no GitHub (sem arquivo .env!)
- [ ] Deploy no Vercel funcionando
- [ ] Variáveis de ambiente configuradas
- [ ] Endpoint `/` retorna sucesso
- [ ] Consegue registrar empresa
- [ ] Consegue fazer login
- [ ] Token JWT funciona

---

## 🆘 Precisa de Ajuda?

1. **Logs do Vercel:** Dashboard → Deployment → Function Logs
2. **Logs do Supabase:** Dashboard → Database → Logs
3. **Testar localmente primeiro:** `npm run dev`

---

## 🎯 Resumo Executivo (Cola)

```bash
# GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/SEU_USUARIO/sirius-web-api.git
git branch -M main
git push -u origin main

# Vercel
1. Acesse vercel.com
2. Import projeto do GitHub
3. Configure variáveis de ambiente
4. Deploy!
```

**Pronto! API no ar! 🚀**
