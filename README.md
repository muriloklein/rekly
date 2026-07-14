# 💰 Rekly

Rekly é uma aplicação web desenvolvida para auxiliar no gerenciamento de gastos recorrentes, como assinaturas de serviços, contas mensais, academias, planos de streaming, internet, água, energia e outras despesas periódicas.

O objetivo da plataforma é centralizar essas informações em um único ambiente, permitindo que o usuário acompanhe seus gastos, organize vencimentos e receba notificações para evitar esquecimentos.

---

## 🚀 Tecnologias

### Frontend
- Next.js 16
- React 19
- TypeScript
- Tailwind CSS

### Backend
- Next.js API Routes
- JWT Authentication
- Prisma ORM

### Banco de Dados
- PostgreSQL
- Docker Compose

### Outras tecnologias
- Nodemailer
- bcryptjs
- Prisma Client

---

## ✨ Funcionalidades

- Cadastro de usuários
- Login com autenticação JWT
- Cadastro de gastos recorrentes
- Edição e exclusão de despesas
- Controle de vencimentos
- Notificações automáticas
- Interface responsiva
- Persistência de dados em PostgreSQL

---

## 📁 Estrutura do projeto

```
rekly/
│
├── app/
├── components/
├── prisma/
├── public/
├── scripts/
├── lib/
└── docker-compose.yml
```

---

## ⚙️ Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/muriloklein/rekly.git
cd rekly
```

---

### 2. Instale as dependências

```bash
npm install
```

---

### 3. Configure as variáveis de ambiente

Crie um arquivo `.env.local` contendo, no mínimo:

```env
DATABASE_URL=
JWT_SECRET=
```

---

### 4. Inicie o banco de dados

```bash
docker compose up -d
```

---

### 5. Gere o cliente Prisma

```bash
npx prisma generate
```

---

### 6. Execute as migrations

```bash
npx prisma migrate deploy
```

---

### 7. Execute a aplicação

```bash
npm run dev
```

A aplicação estará disponível em:

```
http://localhost:3000
```

---

## 📦 Scripts disponíveis

```bash
npm run dev                 # Executa a aplicação
npm run build               # Gera a versão de produção
npm run start               # Executa a versão de produção
npm run lint                # Executa o ESLint
npm run prisma:generate     # Gera o Prisma Client
npm run db:deploy           # Executa as migrations
npm run cron:notificacoes   # Executa o serviço de notificações
```

---

## 🛠️ Arquitetura

- **Frontend:** Next.js + React
- **Backend:** API Routes do Next.js
- **ORM:** Prisma
- **Banco de Dados:** PostgreSQL
- **Autenticação:** JWT
- **Containerização:** Docker Compose

---

## 📌 Principais recursos

- Controle de despesas recorrentes
- Organização financeira
- Cadastro de categorias
- Acompanhamento de vencimentos
- Notificações automáticas
- Interface moderna e responsiva

---

## 👨‍💻 Autores

- Murilo Kaemmerer Klein
- Guilherme
- Samuel
