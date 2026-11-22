# Guide de démonstration

Comment lancer le projet et montrer ce qui fonctionne aujourd'hui (étapes 1 à 7 : socle, authentification, utilisateurs, CRUD serveurs).

Les commandes sont écrites pour **PowerShell** (Windows). Sous Git Bash, remplacer `;` par `&&` et `Copy-Item` par `cp`.

---

## 1. Prérequis

- Node.js 20+ et npm
- Docker Desktop **démarré** (l'icône de la baleine doit être verte)
- Le dépôt cloné, sur la branche `develop` à jour :

```powershell
cd CloudOps_Manager
git checkout develop
git pull
```

## 2. Variables d'environnement (une seule fois)

```powershell
Copy-Item .env.example .env
Copy-Item .env.example backend/.env
```

Dans **les deux** fichiers, modifier :
- `POSTGRES_PASSWORD` et le mot de passe dans `DATABASE_URL` (même valeur)
- `JWT_SECRET` : une longue chaîne aléatoire

## 3. Lancer la base de données

```powershell
docker compose up -d db
docker ps                      # cloudops-db doit être "healthy"
```

## 4. Lancer le backend

```powershell
cd backend
npm install                    # installe les dépendances + prisma generate
npx prisma migrate deploy      # crée / met à jour les tables
npm run start:dev              # API en mode watch
```

Le terminal affiche :

```
API: http://localhost:3001/api/v1
Swagger: http://localhost:3001/api/docs
```

Vérification rapide : http://localhost:3001/api/v1/health

## 5. Montrer la qualité du code (autre terminal, dans `backend/`)

```powershell
npm run lint                   # ESLint + Prettier
npm run build                  # compilation TypeScript
npm test                       # tests unitaires (31 tests)
npm run test:e2e               # tests e2e sur la vraie base (401, 403, 404, 409...)
```

## 6. Lancer le frontend (optionnel à ce stade)

Seule l'initialisation Next.js existe pour l'instant (pages prévues à partir de l'étape 11).

```powershell
cd frontend
npm install
npm run dev                    # http://localhost:3000
```

---

## 7. Scénario de démonstration dans Swagger

Ouvrir **http://localhost:3001/api/docs**.

### 7.1 Authentification

1. **Auth → `POST /auth/register`** → *Try it out* :
   ```json
   {
     "email": "admin@cloudops.local",
     "password": "Password1!",
     "firstName": "Admin",
     "lastName": "Demo"
   }
   ```
   Le premier compte de la base devient **ADMIN**. La réponse contient `accessToken`.
2. Copier `accessToken`, cliquer **Authorize** (en haut à droite), coller le jeton, valider.
3. **`GET /auth/me`** → affiche l'utilisateur et son rôle.

> Si un compte existe déjà, utiliser `POST /auth/login` avec son email et son mot de passe.

### 7.2 Créer un environnement (temporaire)

L'API Projets / Environnements (étape 8, étudiant A) n'est pas encore fusionnée. On crée donc un projet et un environnement directement en base :

```powershell
docker exec -it cloudops-db psql -U <POSTGRES_USER> -d <POSTGRES_DB>
```

(remplacer par les valeurs de votre `.env`, par défaut `cloudops` / `cloudops`)

```sql
INSERT INTO projects (id, name, "createdById", "updatedAt")
  SELECT gen_random_uuid(), 'Demo', id, now() FROM users WHERE role = 'ADMIN' LIMIT 1;

INSERT INTO environments (id, "projectId", type, name, "updatedAt")
  SELECT gen_random_uuid(), id, 'PROD', 'prod', now() FROM projects WHERE name = 'Demo'
  RETURNING id;

\q
```

Garder l'`id` affiché : c'est l'`environmentId`.

Alternative graphique : `npm run prisma:studio` (dans `backend/`) puis ajouter les lignes à la main.

### 7.3 CRUD serveurs

| # | Action | Résultat attendu |
|---|---|---|
| 1 | `POST /servers` avec le corps ci-dessous | **201**, serveur créé avec son environnement et son projet |
| 2 | Renvoyer exactement le même corps | **409** : nom déjà utilisé dans cet environnement |
| 3 | `POST /servers` avec `"cpuCores": 0` ou `"ipAddress": "abc"` | **400** avec la liste des erreurs de validation |
| 4 | `POST /servers` avec un champ inconnu (`"foo": 1`) | **400** : champ refusé (whitelist) |
| 5 | Créer 2 ou 3 autres serveurs (noms, providers, régions différents) | **201** |
| 6 | `GET /servers?page=1&limit=2&sortBy=name&order=asc` | Liste paginée, voir `meta` (total, pages) |
| 7 | `GET /servers?search=web&provider=aws&status=ACTIVE` | Recherche + filtres (insensibles à la casse) |
| 8 | `GET /servers/{id}` | **200** |
| 9 | `GET /servers/123` | **400** : l'id n'est pas un UUID |
| 10 | `PATCH /servers/{id}` avec `{ "ramGb": 16 }` | **200**, seul ce champ change |
| 11 | `PATCH /servers/{id}/status` avec `{ "status": "MAINTENANCE" }` | **200** |
| 12 | `DELETE /servers/{id}` | **204** |
| 13 | `GET /servers/{id}` (même id) | **404** |

Corps pour la création :

```json
{
  "environmentId": "<id de l'environnement>",
  "name": "web-prod-01",
  "provider": "AWS",
  "region": "eu-west-3",
  "cpuCores": 2,
  "ramGb": 4,
  "storageGb": 80,
  "ipAddress": "10.0.0.12"
}
```

### 7.4 Sécurité : 401 et 403

1. **Authorize → Logout**, puis `GET /servers` → **401** (pas de jeton).
2. `POST /auth/register` avec un deuxième email → ce compte est **VIEWER**.
3. **Authorize** avec le jeton du VIEWER :
   - `GET /servers` → **200** (lecture autorisée à tous)
   - `POST /servers` → **403** (réservé Admin / DevOps)
   - `DELETE /servers/{id}` → **403** (réservé Admin)
   - `GET /users` → **403** (réservé Admin)
4. Revenir sur le jeton ADMIN : `PATCH /users/{id}/role` avec `{ "role": "DEVOPS" }` sur le deuxième compte. Avec le jeton de ce compte, `POST /servers` passe (**201**) mais `DELETE /servers/{id}` reste **403**.

> Le rôle est relu en base à chaque requête : pas besoin de se reconnecter après le changement de rôle.

---

## 8. Variante en ligne de commande (sans Swagger)

```powershell
$api = "http://localhost:3001/api/v1"
$login = Invoke-RestMethod -Method Post -Uri "$api/auth/login" -ContentType "application/json" `
  -Body '{"email":"admin@cloudops.local","password":"Password1!"}'
$h = @{ Authorization = "Bearer $($login.accessToken)" }

Invoke-RestMethod -Uri "$api/auth/me" -Headers $h
Invoke-RestMethod -Uri "$api/servers?limit=5" -Headers $h | ConvertTo-Json -Depth 5
```

## 9. Consulter la base

```powershell
cd backend
npm run prisma:studio          # http://localhost:5555
```

## 10. Arrêter

```powershell
# Ctrl+C dans le terminal du backend, puis :
docker compose stop db         # les données restent dans le volume pgdata
```

Ne **pas** lancer `docker compose down -v` : l'option `-v` supprime le volume et donc toutes les données.

## Problèmes fréquents

| Symptôme | Cause / solution |
|---|---|
| `failed to connect to the docker API` | Docker Desktop n'est pas démarré |
| `Can't reach database server at localhost:5432` | Lancer `docker compose up -d db`, vérifier `DATABASE_URL` dans `backend/.env` |
| `JWT_SECRET` manquant au démarrage | `backend/.env` absent ou incomplet |
| Port 5432 déjà utilisé | Un autre PostgreSQL tourne : changer `POSTGRES_PORT` dans `.env` et le port dans `DATABASE_URL` |
| `@prisma/client did not initialize` | Lancer `npx prisma generate` dans `backend/` |
| Port 3001 déjà utilisé | Une autre instance du backend tourne encore : la fermer |
