This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Run the full development environment with one command:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

That command now:

1. Starts the PostgreSQL container with Docker Compose.
2. Waits for the database to accept connections.
3. Runs `prisma generate`.
4. Runs `prisma migrate deploy`.
5. Starts the Next.js development server.

If you prefer to run the steps manually (step-by-step), here are the exact commands to run in order:

1) Start the database (Docker Compose):

```bash
docker compose up -d
```

2) Install node dependencies (if not installed):

```bash
npm install
```

3) Ensure environment variables are set in `.env.local` (at minimum `DATABASE_URL` and `JWT_SECRET`).

4) Generate the Prisma client:

```bash
npx prisma generate
```

5) Apply migrations to the database (choose one):

- For a developer workflow (creates new migrations when schema changed):

```bash
npx prisma migrate dev
```

- For applying already-committed migrations (non-interactive / CI):

```bash
npx prisma migrate deploy
```

6) Start Next.js in development mode:

```bash
npm run dev
```

Useful extras:

```bash
# Stop database containers
docker compose down

# Remove DB volume (data loss)
docker compose down -v
```

Notes:
- The project expects a PostgreSQL instance reachable via `DATABASE_URL` in `.env.local` (the repository includes a `docker-compose.yml` that starts Postgres with user `rekly`).
- After the migrations are applied you can create a user via the app's `/register` page before attempting to log in.
- If you change the Prisma schema, run `npx prisma migrate dev` to create a new migration, then commit it.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
