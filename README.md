# Orbit API

Engineering release management platform. Track deployments across environments, automate changelogs, and alert your team the moment something goes wrong.

## What it does

- **Release tracking** — create and manage releases with versioning, tags, and status lifecycle (draft → staged → deployed → rolled back)
- **Environment management** — define environments (dev, staging, production) per workspace and track what's deployed where
- **Deployment logs** — every deploy is recorded with who triggered it, when, and what changed
- **Instant alerts** — Slack and email notifications on deployment failures, rollbacks, and release milestones
- **API key auth** — machine-to-machine auth for CI/CD pipelines

## Stack

- **NestJS** + TypeScript
- **PostgreSQL** via TypeORM
- **JWT** + API key authentication
- **Resend** for email alerts
- **Slack Webhooks** for channel notifications

## Getting started

```bash
cp .env.example .env
docker-compose up -d
npm install
npm run start:dev
```

API docs available at `http://localhost:3000/docs` once running.

## Project structure

```
src/
  modules/
    auth/          — users, workspaces, JWT, API keys
    releases/      — releases, environments, deployment logs
    notifications/ — Slack and email alert delivery
  common/          — shared guards, filters, decorators
  database/        — TypeORM data source + migrations
```
