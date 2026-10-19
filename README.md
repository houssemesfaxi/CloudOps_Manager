# CloudOps Manager

Plateforme web full-stack de gestion de projets, serveurs et applications cloud, avec supervision (CPU/RAM), alertes et dashboard.

**Stack** : Next.js (App Router, TypeScript) · NestJS (TypeScript, REST, Swagger) · PostgreSQL + Prisma · JWT + rôles · Docker Compose · Jest

## Équipe
- Étudiant A — _à compléter_
- Étudiant B — _à compléter_

## Structure du dépôt
```
cloudops-manager/
├── backend/            # API NestJS
├── frontend/           # Application Next.js
├── docs/               # Analyse, UML, architecture, planning
├── docker-compose.yml
├── .env.example
└── README.md
```

## Documentation (semaine 1)
- [Analyse des besoins](docs/01-analyse-besoins.md)
- [Modélisation UML](docs/02-uml.md)
- [Architecture](docs/03-architecture.md)
- [Répartition et planning](docs/04-repartition-planning.md)
- [Workflow Git](docs/05-git-workflow.md)

## Installation (à compléter au fil du projet)
```bash
cp .env.example .env
docker compose up -d db           # base PostgreSQL seule (développement)
# Backend
cd backend && npm install && npx prisma migrate dev && npm run start:dev
# Frontend
cd frontend && npm install && npm run dev
```
- Frontend : http://localhost:3000
- API : http://localhost:3001/api/v1
- Swagger : http://localhost:3001/api/docs

## Rôles
Admin · DevOps · Viewer (voir la matrice des permissions dans `docs/01-analyse-besoins.md`).

## Avancement
- [x] Semaine 1 — Analyse, UML, architecture, repository
- [ ] Semaine 2 — Modèles de données, entités, migrations
- [ ] Semaine 3 — JWT, Guards, rôles, validation, Swagger
- [ ] Semaine 4 — Interface Next.js, authentification
- [ ] Semaine 5 — Projets, serveurs, applications
- [ ] Semaine 6 — Supervision, alertes, dashboard
- [ ] Semaine 7 — Docker, tests, déploiement
- [ ] Semaine 8 — Documentation et soutenance
