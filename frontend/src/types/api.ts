/**
 * Types of the API responses (see Swagger: http://localhost:3001/api/docs).
 * Dates arrive as ISO strings in JSON.
 */

// --- Shared ---

/** Every list endpoint answers { data, meta } (docs/03, section 4). */
export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

/** Every error: { statusCode, message, error, timestamp, path }. */
export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}

export type SortOrder = "asc" | "desc";

// --- Users and projects (member A) ---

export type Role = "ADMIN" | "DEVOPS" | "VIEWER";
export type EnvironmentType = "DEV" | "STAGING" | "PROD";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Environment as embedded in a server or an application. */
export interface EnvironmentRef {
  id: string;
  name: string;
  type: EnvironmentType;
  project: { id: string; name: string };
}

// --- Servers, applications, monitoring (member B) ---

export type ServerStatus = "ACTIVE" | "STOPPED" | "MAINTENANCE" | "OFFLINE";
export type ApplicationStatus = "RUNNING" | "STOPPED" | "FAILED";

export interface Server {
  id: string;
  environmentId: string;
  name: string;
  provider: string;
  region: string;
  cpuCores: number;
  ramGb: number;
  storageGb: number;
  ipAddress: string | null;
  status: ServerStatus;
  createdAt: string;
  updatedAt: string;
  environment: EnvironmentRef;
  _count: { applications: number };
}

export interface Application {
  id: string;
  serverId: string;
  environmentId: string;
  name: string;
  version: string;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  server: { id: string; name: string; status: ServerStatus };
  environment: EnvironmentRef;
}

export interface MetricPoint {
  cpuUsage: number;
  ramUsage: number;
  isUp: boolean;
  recordedAt: string;
}

export interface MetricsHistory {
  serverId: string;
  from: string;
  to: string;
  data: MetricPoint[];
}

export interface Uptime {
  serverId: string;
  from: string;
  to: string;
  totalMeasures: number;
  upMeasures: number;
  uptimePercent: number | null;
}

// --- Alerts (member B, step 16) ---

export type AlertSeverity = "INFO" | "WARNING" | "CRITICAL";
export type AlertStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
