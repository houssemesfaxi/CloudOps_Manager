# 03 — Architecture

## 1. Vue d'ensemble

```mermaid
flowchart LR
    User([Navigateur]) -->|HTTP :3000| FE
    subgraph Docker Compose
        FE[Frontend<br/>Next.js App Router]
        BE[Backend<br/>NestJS REST + Swagger]
        DB[(PostgreSQL<br/>volume persistant)]
        SCH[Scheduler<br/>@nestjs/schedule]
    end
    FE -->|REST JSON + JWT :3001| BE
    BE --> DB
    SCH -.dans le backend.-> BE
    BE -->|/api/docs| SW[Swagger UI]
```

| Couche | Technologie | Rôle |
|---|---|---|
| Frontend | Next.js, TypeScript, App Router | UI responsive, appels API, graphiques (Recharts) |
| Backend | NestJS, TypeScript | API REST, auth, métier, scheduler |
| Base de données | PostgreSQL + Prisma | 9 entités, migrations |
| Sécurité | JWT, Guards, `@Roles()` | Authentification et autorisation |
| Infra | Docker, Docker Compose | 3 conteneurs : frontend, backend, db |
| Tests | Jest (+ Supertest) | Unitaires et intégration |

## 2. Architecture backend (modulaire NestJS)

```
backend/src/
├── main.ts                  # bootstrap, ValidationPipe, Swagger, CORS
├── app.module.ts
├── common/
│   ├── decorators/          # @Roles(), @CurrentUser()
│   ├── guards/              # JwtAuthGuard, RolesGuard
│   ├── filters/             # HttpExceptionFilter (gestion centralisée)
│   ├── dto/                 # PaginationQueryDto, PaginatedResponse
│   └── interceptors/
├── prisma/                  # PrismaModule + PrismaService
├── auth/                    # login, register, JWT strategy
├── users/
├── projects/                # + membres
├── environments/
├── servers/
├── applications/
├── monitoring/              # metrics + scheduler
├── alerts/                  # rules + alerts
└── dashboard/               # agrégations
```
Chaque module : `controller` → `service` → `Prisma`, avec ses `dto/`, ses tests `*.spec.ts`.

## 3. Architecture frontend (Next.js App Router)

```
frontend/src/
├── app/
│   ├── (auth)/login, register
│   └── (dashboard)/
│       ├── layout.tsx       # sidebar + navbar, protection de route
│       ├── page.tsx         # dashboard
│       ├── projects/
│       ├── servers/
│       ├── applications/
│       ├── monitoring/
│       ├── alerts/
│       └── users/           # Admin uniquement
├── components/              # ui/, charts/, tables/, forms/
├── lib/                     # api client (fetch + JWT), auth helpers
├── hooks/
├── types/                   # types partagés avec l'API
└── middleware.ts            # redirection si non authentifié
```

## 4. Conventions d'API
- Préfixe global : `/api/v1` ; Swagger sur `/api/docs`.
- Liste paginée : `?page=1&limit=10&search=...&sortBy=...&order=asc`.
- Réponse paginée : `{ "data": [...], "meta": { "total", "page", "limit", "totalPages" } }`.
- Erreur : `{ "statusCode", "message", "error", "timestamp", "path" }`.
- Codes : 200/201/204, 400 validation, 401 non authentifié, 403 rôle insuffisant, 404, 409 conflit.

## 5. Liste des endpoints prévus (≈ 45 > 20 exigés)

| Module | Méthode | Route | Rôles |
|---|---|---|---|
| Auth | POST | /auth/register | public |
| Auth | POST | /auth/login | public |
| Auth | GET | /auth/me | tous |
| Users | GET | /users | Admin |
| Users | GET | /users/:id | Admin |
| Users | PATCH | /users/:id/role | Admin |
| Users | PATCH | /users/:id/status | Admin |
| Users | DELETE | /users/:id | Admin |
| Users | PATCH | /users/me | tous |
| Users | PATCH | /users/me/password | tous |
| Projects | GET | /projects | tous |
| Projects | POST | /projects | Admin, DevOps |
| Projects | GET | /projects/:id | tous |
| Projects | PATCH | /projects/:id | Admin, DevOps |
| Projects | DELETE | /projects/:id | Admin |
| Projects | POST | /projects/:id/members | Admin, DevOps |
| Projects | DELETE | /projects/:id/members/:userId | Admin, DevOps |
| Environments | GET | /projects/:id/environments | tous |
| Environments | POST | /projects/:id/environments | Admin, DevOps |
| Environments | PATCH | /environments/:id | Admin, DevOps |
| Environments | DELETE | /environments/:id | Admin |
| Servers | GET | /servers | tous |
| Servers | POST | /servers | Admin, DevOps |
| Servers | GET | /servers/:id | tous |
| Servers | PATCH | /servers/:id | Admin, DevOps |
| Servers | PATCH | /servers/:id/status | Admin, DevOps |
| Servers | DELETE | /servers/:id | Admin |
| Applications | GET | /applications | tous |
| Applications | POST | /applications | Admin, DevOps |
| Applications | GET | /applications/:id | tous |
| Applications | PATCH | /applications/:id | Admin, DevOps |
| Applications | DELETE | /applications/:id | Admin |
| Monitoring | GET | /monitoring/servers/:id/metrics | tous |
| Monitoring | GET | /monitoring/servers/:id/uptime | tous |
| Monitoring | GET | /monitoring/servers/:id/latest | tous |
| Monitoring | POST | /monitoring/servers/:id/metrics | Admin, DevOps |
| Alerts | GET | /alert-rules | tous |
| Alerts | POST | /alert-rules | Admin, DevOps |
| Alerts | PATCH | /alert-rules/:id | Admin, DevOps |
| Alerts | DELETE | /alert-rules/:id | Admin, DevOps |
| Alerts | GET | /alerts | tous |
| Alerts | PATCH | /alerts/:id/acknowledge | Admin, DevOps |
| Alerts | PATCH | /alerts/:id/resolve | Admin, DevOps |
| Dashboard | GET | /dashboard/summary | tous |
| Dashboard | GET | /dashboard/charts | tous |

## 6. Sécurité
1. `JwtAuthGuard` global (routes publiques marquées `@Public()`).
2. `RolesGuard` + décorateur `@Roles(Role.ADMIN, Role.DEVOPS)`.
3. Hash bcrypt (10+ rounds), JWT avec expiration courte, secret en variable d'environnement.
4. `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`.
5. Les contrôles d'accès sont faits côté backend ; le front ne fait que masquer l'UI.

## 7. Stratégie de tests
- **Unitaires (Jest)** : services (auth, alerts, monitoring) avec Prisma mocké.
- **Intégration (Supertest)** : login, accès 401/403, CRUD serveurs, déclenchement d'alerte.
- Objectif : ≥ 60 % de couverture sur les services critiques.

## 8. Environnements et déploiement
- Local : `docker compose up` (db seule en dev, ou stack complète).
- Démo : VM/VPS avec Docker Compose, reverse proxy Nginx optionnel.
- Variables : `.env` (non versionné), `.env.example` (versionné).
- Bonus visé : GitHub Actions (lint + tests + build des images).
