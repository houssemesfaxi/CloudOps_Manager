# 02 — Modélisation UML

> Les diagrammes sont en **Mermaid** : ils s'affichent directement sur GitHub. Pour le rapport, exportez-les en image avec https://mermaid.live.

## 1. Diagramme de cas d'utilisation

```mermaid
flowchart LR
    Admin([Admin])
    DevOps([DevOps])
    Viewer([Viewer])
    Sys([Système / Scheduler])

    subgraph CloudOps Manager
        UC1(S'authentifier)
        UC2(Gérer son profil)
        UC3(Gérer utilisateurs et rôles)
        UC4(Gérer projets et équipes)
        UC5(Gérer environnements)
        UC6(Gérer serveurs)
        UC7(Gérer applications)
        UC8(Consulter monitoring)
        UC9(Configurer seuils d'alerte)
        UC10(Acquitter / résoudre alertes)
        UC11(Consulter dashboard)
        UC12(Générer mesures CPU/RAM)
        UC13(Déclencher alertes)
    end

    Viewer --> UC1
    Viewer --> UC2
    Viewer --> UC8
    Viewer --> UC11
    DevOps --> UC4
    DevOps --> UC5
    DevOps --> UC6
    DevOps --> UC7
    DevOps --> UC9
    DevOps --> UC10
    Admin --> UC3
    Sys --> UC12
    Sys --> UC13
    DevOps -.hérite de.-> Viewer
    Admin -.hérite de.-> DevOps
```

## 2. Modèle de données (diagramme entité-relation)

```mermaid
erDiagram
    USER ||--o{ PROJECT_MEMBER : "participe"
    PROJECT ||--o{ PROJECT_MEMBER : "a"
    PROJECT ||--o{ ENVIRONMENT : "contient"
    ENVIRONMENT ||--o{ SERVER : "héberge"
    SERVER ||--o{ APPLICATION : "exécute"
    ENVIRONMENT ||--o{ APPLICATION : "classe"
    SERVER ||--o{ METRIC : "produit"
    SERVER ||--o{ ALERT_RULE : "surveillé par"
    ALERT_RULE ||--o{ ALERT : "déclenche"
    SERVER ||--o{ ALERT : "concerne"
    USER ||--o{ ALERT : "acquitte"
    USER ||--o{ PROJECT : "crée"

    USER {
        uuid id PK
        string email UK
        string passwordHash
        string firstName
        string lastName
        enum role "ADMIN|DEVOPS|VIEWER"
        boolean isActive
        datetime createdAt
    }
    PROJECT {
        uuid id PK
        string name
        string description
        enum status "ACTIVE|ARCHIVED"
        uuid createdById FK
        datetime createdAt
    }
    PROJECT_MEMBER {
        uuid id PK
        uuid userId FK
        uuid projectId FK
        enum projectRole "OWNER|MEMBER"
    }
    ENVIRONMENT {
        uuid id PK
        uuid projectId FK
        enum type "DEV|STAGING|PROD"
        string name
    }
    SERVER {
        uuid id PK
        uuid environmentId FK
        string name
        string provider
        string region
        int cpuCores
        int ramGb
        int storageGb
        string ipAddress
        enum status "ACTIVE|STOPPED|MAINTENANCE|OFFLINE"
    }
    APPLICATION {
        uuid id PK
        uuid serverId FK
        uuid environmentId FK
        string name
        string version
        enum status "RUNNING|STOPPED|FAILED"
    }
    METRIC {
        uuid id PK
        uuid serverId FK
        float cpuUsage
        float ramUsage
        boolean isUp
        datetime recordedAt
    }
    ALERT_RULE {
        uuid id PK
        uuid serverId FK "null = règle globale"
        enum metric "CPU|RAM"
        enum operator "GT|LT"
        float threshold
        enum severity "INFO|WARNING|CRITICAL"
        boolean isActive
    }
    ALERT {
        uuid id PK
        uuid ruleId FK
        uuid serverId FK
        enum severity
        enum status "OPEN|ACKNOWLEDGED|RESOLVED"
        float triggeredValue
        string message
        uuid acknowledgedById FK
        datetime createdAt
        datetime resolvedAt
    }
```

**9 entités** (≥ 8 exigées) : User, Project, ProjectMember, Environment, Server, Application, Metric, AlertRule, Alert.

## 3. Diagramme de classes (couche backend NestJS)

```mermaid
classDiagram
    class AuthModule
    class UsersModule
    class ProjectsModule
    class EnvironmentsModule
    class ServersModule
    class ApplicationsModule
    class MonitoringModule
    class AlertsModule
    class DashboardModule
    class PrismaModule

    class JwtAuthGuard
    class RolesGuard
    class HttpExceptionFilter

    AuthModule --> UsersModule
    ProjectsModule --> EnvironmentsModule
    ServersModule --> EnvironmentsModule
    ApplicationsModule --> ServersModule
    MonitoringModule --> ServersModule
    AlertsModule --> MonitoringModule
    DashboardModule --> ServersModule
    DashboardModule --> AlertsModule
    DashboardModule --> ProjectsModule
    AuthModule ..> JwtAuthGuard
    AuthModule ..> RolesGuard
    UsersModule ..> PrismaModule
    ProjectsModule ..> PrismaModule
    ServersModule ..> PrismaModule
    MonitoringModule ..> PrismaModule
    AlertsModule ..> PrismaModule
```

## 4. Diagramme de séquence — Authentification et accès protégé

```mermaid
sequenceDiagram
    actor U as Utilisateur
    participant F as Frontend Next.js
    participant B as Backend NestJS
    participant DB as PostgreSQL

    U->>F: Saisit email + mot de passe
    F->>B: POST /auth/login
    B->>DB: Recherche utilisateur par email
    DB-->>B: Utilisateur + hash
    B->>B: Vérifie le mot de passe (bcrypt)
    B-->>F: 200 { accessToken (JWT) }
    F->>F: Stocke le token (cookie httpOnly)
    U->>F: Ouvre la page Serveurs
    F->>B: GET /servers (Authorization: Bearer JWT)
    B->>B: JwtAuthGuard puis RolesGuard
    B->>DB: SELECT servers (pagination, filtres)
    DB-->>B: Résultats
    B-->>F: 200 { data, meta }
```

## 5. Diagramme de séquence — Mesure simulée et déclenchement d'alerte

```mermaid
sequenceDiagram
    participant S as Scheduler (cron)
    participant M as MonitoringService
    participant DB as PostgreSQL
    participant A as AlertsService
    participant F as Frontend (polling)

    S->>M: Toutes les 30 s
    M->>DB: Liste serveurs ACTIVE
    loop Pour chaque serveur
        M->>M: Génère CPU/RAM simulés
        M->>DB: INSERT Metric
        M->>A: evaluate(serverId, metric)
        A->>DB: Charge règles actives
        alt Seuil dépassé et pas d'alerte ouverte
            A->>DB: INSERT Alert (OPEN)
        else Retour sous le seuil
            A->>DB: UPDATE Alert (RESOLVED)
        end
    end
    F->>M: GET /monitoring/servers/:id/metrics
    M-->>F: Historique + uptime
```

## 6. Diagramme d'états — Cycle de vie d'une alerte

```mermaid
stateDiagram-v2
    [*] --> OPEN: Seuil dépassé
    OPEN --> ACKNOWLEDGED: DevOps/Admin acquitte
    OPEN --> RESOLVED: Retour à la normale
    ACKNOWLEDGED --> RESOLVED: Résolution manuelle ou auto
    RESOLVED --> [*]
```
