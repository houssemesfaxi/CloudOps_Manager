# 04 — Répartition du travail et planning

Les étudiants sont désignés **A** et **B** (remplacez par vos prénoms).

## Principe
Une modification technique en direct peut être demandée à **chaque** membre à la soutenance. La répartition se fait donc par **modules verticaux** : chacun développe backend **et** frontend de ses modules, et chacun touche à Docker et aux tests.

## Répartition par module

| Domaine | Étudiant A | Étudiant B |
|---|---|---|
| **Auth & sécurité** | Auth, JWT, Guards, rôles, Users, profils | Relecture de sécurité, tests 401/403 |
| **Projets** | Projets, membres, environnements (API + UI) | |
| **Serveurs & applications** | | Serveurs, applications (API + UI) |
| **Monitoring** | | Metrics, scheduler, uptime, graphiques |
| **Alertes** | | Règles, alertes, historique (API + UI) |
| **Dashboard** | Dashboard (API d'agrégation + compteurs) | Graphiques du dashboard |
| **Socle commun backend** | Prisma, filtre d'exceptions, pagination, Swagger | |
| **Socle commun frontend** | | Layout, client API, composants UI de base |
| **Docker & déploiement** | Dockerfiles, Compose, VM/VPS | Variables d'env, seed, volumes |
| **Tests** | Tests auth, projets, dashboard | Tests serveurs, monitoring, alertes |
| **Documentation** | README, rapport (sections archi/sécurité) | Rapport (sections métier/monitoring), slides |

Équilibrage : A porte l'auth, le socle et l'infra ; B porte le métier de supervision (serveurs → alertes). Si l'un des deux finit en avance, il reprend le dashboard ou les bonus (CI/CD, WebSocket).

## Semaine 1 (en cours) — qui fait quoi

| Tâche | Responsable | Relecteur |
|---|---|---|
| Créer le repository GitHub, inviter le binôme, protéger `main` | A | B |
| Structure monorepo, `.gitignore`, `.env.example`, README | A | B |
| Analyse des besoins (`01-analyse-besoins.md`) | A + B (ensemble) | — |
| Diagramme de cas d'utilisation + architecture (`03-architecture.md`) | A | B |
| ERD, diagramme de classes, séquences, états (`02-uml.md`) | B | A |
| Liste des endpoints, conventions d'API | B | A |
| Initialiser NestJS (`backend/`) et Next.js (`frontend/`) | A : backend, B : frontend | croisée |
| Premier commit de chaque membre (historique Git visible) | A et B | — |

## Planning des 8 semaines

| Sem. | Étudiant A | Étudiant B |
|---|---|---|
| 1 | Repo, architecture, cas d'utilisation, init NestJS | ERD, séquences, endpoints, init Next.js |
| 2 | Prisma, schéma User/Project/Member/Environment, migrations, modules Auth/Users/Projects | Schéma Server/Application/Metric/AlertRule/Alert, modules Servers/Applications |
| 3 | JWT, Guards, rôles, Swagger, filtre d'exceptions, pagination | DTO et validation Servers/Applications, Monitoring (service + scheduler) |
| 4 | Pages login/register, protection de routes, profil | Layout, client API, pages Serveurs. **Évaluation intermédiaire (30 %)** |
| 5 | Projets, équipes, environnements (UI) | Serveurs et applications finalisés (UI) |
| 6 | Dashboard (API + compteurs) | Monitoring, graphiques, alertes |
| 7 | Dockerfiles, Compose, déploiement VM | Tests, seed, variables d'env |
| 8 | Correction, rapport, soutenance | Correction, slides, soutenance |

## Livrables à ne pas oublier
Lien GitHub, application déployée, fichiers Docker, README d'installation, Swagger, diagramme d'architecture, modèle de données, rapport de 10 à 15 pages, support de présentation.

## Points de synchronisation
- Point de 15 min en début de semaine (objectifs) et en fin de semaine (bilan, merge).
- Les contrats d'API (DTO + Swagger) sont figés avant que l'autre ne les consomme côté front.
- Un tableau de tâches (GitHub Projects) avec une colonne par statut : À faire / En cours / En revue / Terminé.
