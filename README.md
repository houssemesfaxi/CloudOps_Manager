# CloudOps Manager

Plateforme web full-stack de gestion de projets, serveurs et applications cloud, avec supervision (CPU/RAM), alertes et dashboard.

**Stack** : Next.js 16 (App Router, TypeScript, Tailwind) · NestJS 11 (REST, Swagger) · PostgreSQL 16 + Prisma 6 · JWT + rôles · Docker Compose · Jest + Supertest

## Équipe

| Membre | Modules |
|---|---|
| Étudiant A — Houssem Eddine | Socle backend, authentification, utilisateurs, projets, environnements, dashboard, Docker |
| Étudiant B — Houssem Ben Chabbeh | Serveurs, applications, monitoring, alertes, socle frontend |

Détail dans [docs/04-repartition-planning.md](docs/04-repartition-planning.md).

## Structure du dépôt

```
CloudOps_Manager/
├── backend/                # API NestJS
│   ├── prisma/             # schema.prisma + migrations
│   ├── src/
│   │   ├── common/         # décorateurs, guards, filtre d'exceptions, pagination
│   │   ├── prisma/         # PrismaService (module global)
│   │   ├── auth/           # register, login, me (JWT)
│   │   ├── users/          # profil + gestion des utilisateurs (Admin)
│   │   ├── servers/        # CRUD serveurs
│   │   └── health/         # GET /health
│   └── test/               # tests e2e
├── frontend/               # Application Next.js
├── docs/                   # Analyse, UML, architecture, planning, workflow Git
├── docker-compose.yml      # PostgreSQL (backend et frontend ajoutés en semaine 7)
└── .env.example
```

## Documentation

- [01 — Analyse des besoins](docs/01-analyse-besoins.md)
- [02 — Modélisation UML](docs/02-uml.md)
- [03 — Architecture](docs/03-architecture.md)
- [04 — Répartition et planning](docs/04-repartition-planning.md)
- [05 — Workflow Git](docs/05-git-workflow.md)

## Installation

Prérequis : Node.js 20+, npm, Docker Desktop.

```bash
# 1. Variables d'environnement (à la racine pour Docker, dans backend/ pour l'API et Prisma)
cp .env.example .env
cp .env.example backend/.env
# Modifier POSTGRES_PASSWORD, DATABASE_URL et JWT_SECRET dans les deux fichiers

# 2. Base de données
docker compose up -d db

# 3. Backend
cd backend
npm install                 # lance aussi "prisma generate"
npx prisma migrate deploy   # applique les migrations
npm run start:dev

# 4. Frontend (autre terminal)
cd frontend
npm install
npm run dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API | http://localhost:3001/api/v1 |
| Swagger | http://localhost:3001/api/docs |
| Santé de l'API | http://localhost:3001/api/v1/health |

Le **premier compte inscrit** devient automatiquement **ADMIN** ; les suivants sont **VIEWER**.

## Scripts backend

| Commande | Rôle |
|---|---|
| `npm run start:dev` | API en mode watch |
| `npm run build` | Compilation |
| `npm run lint` | ESLint + Prettier |
| `npm test` | Tests unitaires (Jest) |
| `npm run test:e2e` | Tests e2e (base de données démarrée et migrée) |
| `npm run prisma:migrate` | Créer une nouvelle migration (développement) |
| `npm run prisma:studio` | Interface web pour consulter la base |

## API disponible

Toutes les routes sont préfixées par `/api/v1` et demandent un jeton `Authorization: Bearer <token>`, sauf celles marquées *public*.

| Module | Routes | Accès |
|---|---|---|
| Health | `GET /health` | public |
| Auth | `POST /auth/register`, `POST /auth/login` | public |
| Auth | `GET /auth/me` | connecté |
| Users | `PATCH /users/me`, `PATCH /users/me/password` | connecté |
| Users | `GET /users`, `GET /users/:id`, `PATCH /users/:id/role`, `PATCH /users/:id/status`, `DELETE /users/:id` | Admin |
| Servers | `GET /servers` (pagination, recherche, filtres, tri), `GET /servers/:id` | connecté |
| Servers | `POST /servers`, `PATCH /servers/:id`, `PATCH /servers/:id/status` | Admin, DevOps |
| Servers | `DELETE /servers/:id` | Admin |

Format d'erreur commun : `{ statusCode, message, error, timestamp, path }`.

## Rôles

Admin · DevOps · Viewer — matrice des permissions dans [docs/01-analyse-besoins.md](docs/01-analyse-besoins.md).

## Avancement

- [x] Semaine 1 — Analyse, UML, architecture, repository, initialisation backend et frontend
- [x] Semaine 2 — Prisma, modèles de données et migrations (projets et monitoring)
- [x] Semaine 3 — JWT, guards, rôles, validation, Swagger, utilisateurs, CRUD serveurs
- [ ] Semaine 3 — Projets / environnements, applications
- [ ] Semaine 4 — Interface Next.js, authentification, pages serveurs
- [ ] Semaine 5 — Pages projets et applications, monitoring (scheduler CPU/RAM)
- [ ] Semaine 6 — Alertes, dashboard
- [ ] Semaine 7 — Docker, seed, tests, déploiement
- [ ] Semaine 8 — Rapport et soutenance

## Workflow Git

Branches `feature/*`, `chore/*`, `fix/*` → Pull Request relue par l'autre membre → `develop` → `main`. Commits au format Conventional Commits. Voir [docs/05-git-workflow.md](docs/05-git-workflow.md).
