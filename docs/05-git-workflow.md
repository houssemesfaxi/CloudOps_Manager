# 05 — Workflow Git

## Branches
- `main` : toujours stable, démontrable. Protégée : merge uniquement via Pull Request relue par l'autre membre.
- `develop` : intégration des fonctionnalités.
- `feature/<module>-<description>` : ex. `feature/auth-jwt`, `feature/servers-crud`.
- `fix/<description>`, `docs/<description>`, `chore/<description>`.

## Messages de commit (Conventional Commits)
```
feat(auth): ajout de la stratégie JWT
fix(servers): correction du filtre par région
docs(readme): instructions d'installation
test(alerts): tests du déclenchement de seuil
chore(docker): ajout du volume PostgreSQL
```

## Cycle de travail
```bash
git checkout develop && git pull
git checkout -b feature/servers-crud
# ... travail, commits fréquents ...
git push -u origin feature/servers-crud
# Ouvrir une Pull Request vers develop, demander la relecture au binôme
```

## Règles
1. Un commit = un changement logique ; commiter régulièrement (l'historique prouve la contribution de chacun).
2. Chaque membre commit avec son propre compte (`git config user.name` / `user.email` correctement réglés).
3. Pas de push direct sur `main` ni de force-push partagé.
4. Jamais de secrets, `.env` ou `node_modules` dans Git.
5. Résoudre les conflits localement (`git pull --rebase` ou merge de `develop` dans sa branche).
6. Fin de semaine : merge `develop` → `main` + tag (`v0.1-semaine1`, ...).

## Mise en place initiale (à faire par A)
```bash
git init
git add .
git commit -m "chore: structure initiale du projet"
git branch -M main
git remote add origin https://github.com/<utilisateur>/cloudops-manager.git
git push -u origin main
git checkout -b develop && git push -u origin develop
```
Puis sur GitHub : inviter B (Settings → Collaborators), activer la protection de `main` (Settings → Branches → exiger une PR).
