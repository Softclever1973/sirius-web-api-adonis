# 🚀 GUIA COMPLETO: Deploy no GitHub + Vercel

## PARTE 1: Publicar no GitHub (10 minutos)

### Passo 1: Criar repositório no GitHub

1. **Acesse:** https://github.com
2. **Clique** no botão **"+"** (canto superior direito) → **"New repository"**
3. **Preencha:**
   - Repository name: `sirius-web-api-adonis`
   - Description: `API REST para SIRIUS WEB - ERP Multi-Tenant`
   - Visibilidade: **Private** (recomendado) ou Public
   - **NÃO** marque "Add a README file"
   - **NÃO** marque "Add .gitignore"
4. **Clique** em **"Create repository"**

### Passo 2: Preparar o projeto localmente

Abra o terminal na pasta do projeto e execute:

```bash
# 1. Navegar até a pasta do projeto
cd c:\Siriusweb\sirius-web-api-adonis

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

**IMPORTANTE:** Substitua `AdonisEdsonNegri` se for outro usuário!

```bash
# 1. Adicionar remote
git remote add origin https://github.com/AdonisEdsonNegri/sirius-web-api-adonis.git

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

1. Acesse: `https://github.com/AdonisEdsonNegri/sirius-web-api-adonis`
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
2. **Procure** por `sirius-web-api-adonis` na lista
3. **Clique** em **"Import"**

### Passo 3: Configurar o projeto

**Na tela de configuração:**

1. **Project Name:** `sirius-web-api-adonis` (ou outro nome que preferir)

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
   | `DATABASE_URL` | Cole aqui a connection string COMPLETA do Supabase |
   | `JWT_SECRET` | Cole sua chave JWT_SECRET do arquivo .env local |
   | `NODE_ENV` | `production` |
   | `JWT_EXPIRES_IN` | `7d` |

   **IMPORTANTE:**
   - `DATABASE_URL`: Copie do seu `.env` local (já está funcionando!)
   - `JWT_SECRET`: Copie do seu `.env` local (mesma chave!)

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

**URL da sua API:** `https://sirius-web-api-adonis-pearl.vercel.app` (ou similar)

**Teste no navegador:**
```
https://sirius-web-api-adonis-pearl.vercel.app/
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

### Usando Postman (RECOMENDADO)

**Abra sua Collection do Postman e:**

1. **Duplique** todas as requests
2. **Renomeie** adicionando "- VERCEL" no final
3. **Substitua** `http://localhost:3000` por `https://sirius-web-api-adonis-pearl.vercel.app`
4. **Teste cada endpoint!**

**Exemplo:**
- Local: `http://localhost:3000/auth/login`
- Vercel: `https://sirius-web-api-adonis-pearl.vercel.app/auth/login`

### Usando cURL (Terminal)

**1. Health Check:**
```bash
curl https://sirius-web-api-adonis-pearl.vercel.app/
```

**2. Registrar empresa:**
```bash
curl -X POST https://sirius-web-api-adonis-pearl.vercel.app/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Teste",
    "sobrenome": "Vercel",
    "email": "teste@vercel.com",
    "senha": "senha123",
    "celular": "11999999999",
    "razao_social": "Teste Vercel Ltda",
    "nome_fantasia": "Teste Vercel",
    "cnpj": "98765432109876",
    "logradouro": "Rua Vercel",
    "numero": "456",
    "bairro": "Centro",
    "uf": "SP",
    "cep": "01234567",
    "telefone": "1133334444",
    "email_empresa": "contato@vercel.com"
  }'
```

**3. Login:**
```bash
curl -X POST https://sirius-web-api-adonis-pearl.vercel.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@vercel.com",
    "senha": "senha123"
  }'
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
4. **IMPORTANTE:** Use a MESMA connection string que funciona local!

### Erro: "Module not found"

**Solução:**
1. Verifique se `package.json` tem todas as dependências
2. No Vercel: Settings → General → Node.js Version (usar 18.x ou 20.x)
3. Redeploy

### Erro: "Invalid token"

**Solução:**
- `JWT_SECRET` no Vercel deve ser exatamente igual ao do desenvolvimento
- Se mudou o secret, usuários precisam fazer login novamente

### Erro: "This Serverless Function has crashed"

**Solução:**
1. Vá em Deployments → Última → Function Logs
2. Veja o erro específico
3. Geralmente é problema na `DATABASE_URL` ou `JWT_SECRET`

### Git pede senha toda hora

**Solução:**
```bash
# Configurar credential helper
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
# GitHub (JÁ FEITO! ✅)
git init
git add .
git commit -m "Initial commit - SIRIUS WEB API"
git remote add origin https://github.com/AdonisEdsonNegri/sirius-web-api-adonis.git
git branch -M main
git push -u origin main

# Vercel (FAZER AGORA!)
1. Acesse vercel.com
2. Continue with GitHub
3. Import sirius-web-api-adonis
4. Configure variáveis (DATABASE_URL e JWT_SECRET do .env local)
5. Deploy!
6. Aguardar 2 minutos
7. Testar: https://sirius-web-api-adonis-pearl.vercel.app/
```

**Pronto! API no ar! 🚀**
