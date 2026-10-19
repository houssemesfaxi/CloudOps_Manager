# 01 — Analyse des besoins

## 1. Contexte
Une entreprise veut centraliser la gestion de ses **projets**, **serveurs** et **applications cloud**, superviser leur état (CPU/RAM, disponibilité) et traiter les **alertes** associées. CloudOps Manager est une plateforme web full-stack (Next.js + NestJS + PostgreSQL) livrée en conteneurs Docker.

## 2. Acteurs
| Acteur | Description |
|---|---|
| **Admin** | Gère les utilisateurs, les rôles et toutes les ressources. |
| **DevOps** | Gère projets, serveurs, applications, seuils d'alerte ; traite les incidents. |
| **Viewer** | Consultation seule (dashboard, listes, historiques). |
| **Système (scheduler)** | Génère/collecte périodiquement les mesures et déclenche les alertes. |

## 3. Besoins fonctionnels

### 3.1 Authentification et utilisateurs (RF-AUTH)
- RF-AUTH-1 : inscription ; le premier compte / un seed crée l'administrateur.
- RF-AUTH-2 : connexion par email + mot de passe, retour d'un JWT (access token, option refresh token).
- RF-AUTH-3 : gestion des rôles Admin / DevOps / Viewer (l'Admin modifie le rôle d'un utilisateur).
- RF-AUTH-4 : profil utilisateur (consultation, modification, changement de mot de passe).
- RF-AUTH-5 : l'Admin peut lister, désactiver, supprimer des utilisateurs.

### 3.2 Projets (RF-PRJ)
- RF-PRJ-1 : CRUD projets (nom, description, statut, dates).
- RF-PRJ-2 : équipes : ajouter/retirer des membres d'un projet avec un rôle dans le projet.
- RF-PRJ-3 : environnements d'un projet (dev, staging, prod).
- RF-PRJ-4 : affecter des serveurs/applications à un projet et un environnement.
- RF-PRJ-5 : filtres, recherche et pagination (statut, nom, membre).

### 3.3 Serveurs (RF-SRV)
- RF-SRV-1 : CRUD serveurs VPS/VM : nom, fournisseur, région, CPU, RAM, stockage, IP, statut.
- RF-SRV-2 : filtres par fournisseur, région, statut, projet ; recherche par nom/IP.
- RF-SRV-3 : changement de statut (actif, arrêté, maintenance, hors ligne).

### 3.4 Applications (RF-APP)
- RF-APP-1 : CRUD applications rattachées à un serveur : nom, version, environnement, statut.
- RF-APP-2 : historique/changement de version (optionnel).

### 3.5 Monitoring (RF-MON)
- RF-MON-1 : enregistrement de mesures CPU/RAM (et disponibilité) par serveur.
- RF-MON-2 : génération périodique de mesures simulées (cron NestJS `@nestjs/schedule`).
- RF-MON-3 : historique filtrable par période ; graphiques côté front.
- RF-MON-4 : calcul de la disponibilité (uptime %) sur une période.
- RF-MON-5 : rafraîchissement périodique côté front (polling ; WebSocket en bonus).

### 3.6 Alertes (RF-ALR)
- RF-ALR-1 : définir des règles de seuil configurables (métrique, opérateur, valeur, gravité, serveur ou global).
- RF-ALR-2 : création automatique d'une alerte lorsqu'une mesure dépasse un seuil.
- RF-ALR-3 : gravité (info, warning, critical) ; statut (ouverte, acquittée, résolue).
- RF-ALR-4 : historique des incidents, filtres, acquittement/résolution par DevOps/Admin.

### 3.7 Dashboard (RF-DSH)
- RF-DSH-1 : compteurs : projets, serveurs (par statut), applications, alertes ouvertes.
- RF-DSH-2 : graphiques : usage CPU/RAM moyen, alertes par gravité, serveurs par fournisseur.
- RF-DSH-3 : filtres par projet, environnement, période.

### 3.8 Déploiement (RF-DEP)
- RF-DEP-1 : Dockerfile backend et frontend, `docker-compose.yml` (frontend, backend, PostgreSQL).
- RF-DEP-2 : variables d'environnement, volume persistant pour PostgreSQL.
- RF-DEP-3 : déploiement sur VM/VPS/cloud accessible pour la démonstration.

## 4. Matrice des permissions

| Ressource / action | Admin | DevOps | Viewer |
|---|:-:|:-:|:-:|
| Gérer utilisateurs et rôles | ✅ | ❌ | ❌ |
| Consulter son profil / le modifier | ✅ | ✅ | ✅ |
| Projets : lecture | ✅ | ✅ | ✅ |
| Projets : créer / modifier | ✅ | ✅ | ❌ |
| Projets : supprimer | ✅ | ❌ | ❌ |
| Serveurs / Applications : lecture | ✅ | ✅ | ✅ |
| Serveurs / Applications : créer / modifier | ✅ | ✅ | ❌ |
| Serveurs / Applications : supprimer | ✅ | ❌ | ❌ |
| Monitoring : lecture | ✅ | ✅ | ✅ |
| Monitoring : saisie manuelle de mesure | ✅ | ✅ | ❌ |
| Règles d'alerte : configurer | ✅ | ✅ | ❌ |
| Alertes : consulter | ✅ | ✅ | ✅ |
| Alertes : acquitter / résoudre | ✅ | ✅ | ❌ |
| Dashboard | ✅ | ✅ | ✅ |

## 5. Besoins non fonctionnels
- **Sécurité** : mots de passe hashés (bcrypt/argon2), JWT, Guards NestJS (`JwtAuthGuard`, `RolesGuard`), CORS, variables sensibles hors Git.
- **Qualité** : validation par DTO (`class-validator`) + `ValidationPipe`, filtre d'exceptions global, pagination standard.
- **Documentation** : API documentée avec Swagger (`@nestjs/swagger`), ≥ 20 endpoints.
- **Performance** : index sur `Metric(serverId, createdAt)`, pagination obligatoire sur les listes.
- **Ergonomie** : interface responsive, états de chargement et d'erreur gérés.
- **Maintenabilité** : TypeScript strict, ESLint/Prettier, tests Jest (unitaires + quelques intégrations).
- **Portabilité** : exécution via Docker Compose sur toute machine.
- **Contrainte monitoring** : données simulées acceptées ; collecte réelle uniquement sur infra de test contrôlée.

## 6. Hypothèses et choix
- ORM : **Prisma** (migrations simples, typage fort). À confirmer ensemble avant la semaine 2.
- Un serveur appartient à au plus un projet/environnement à la fois.
- Une application est toujours liée à un serveur.
- Mesures simulées toutes les 30 s par un job planifié ; purge ou agrégation au-delà de N jours (optionnel).

## 7. Risques
| Risque | Mitigation |
|---|---|
| Conflits Git | Branches par fonctionnalité, PR relues par l'autre membre |
| Charge inégale | Répartition par modules verticaux (voir `04-repartition-planning.md`) |
| Retard sur le front | Swagger et contrats d'API figés dès la semaine 3 |
| Déploiement tardif | Docker Compose de base dès la semaine 1, test en continu |
| Volume de mesures | Index, pagination, fenêtre temporelle sur les requêtes |
