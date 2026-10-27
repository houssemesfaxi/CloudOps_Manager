-- CreateEnum
CREATE TYPE "ServerStatus" AS ENUM ('ACTIVE', 'STOPPED', 'MAINTENANCE', 'OFFLINE');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('RUNNING', 'STOPPED', 'FAILED');

-- CreateEnum
CREATE TYPE "MetricType" AS ENUM ('CPU', 'RAM');

-- CreateEnum
CREATE TYPE "AlertOperator" AS ENUM ('GT', 'LT');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateTable
CREATE TABLE "servers" (
    "id" UUID NOT NULL,
    "environmentId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "cpuCores" INTEGER NOT NULL,
    "ramGb" INTEGER NOT NULL,
    "storageGb" INTEGER NOT NULL,
    "ipAddress" TEXT,
    "status" "ServerStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "servers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" UUID NOT NULL,
    "serverId" UUID NOT NULL,
    "environmentId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'RUNNING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metrics" (
    "id" UUID NOT NULL,
    "serverId" UUID NOT NULL,
    "cpuUsage" DOUBLE PRECISION NOT NULL,
    "ramUsage" DOUBLE PRECISION NOT NULL,
    "isUp" BOOLEAN NOT NULL DEFAULT true,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_rules" (
    "id" UUID NOT NULL,
    "serverId" UUID,
    "metric" "MetricType" NOT NULL,
    "operator" "AlertOperator" NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'WARNING',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" UUID NOT NULL,
    "ruleId" UUID,
    "serverId" UUID NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
    "triggeredValue" DOUBLE PRECISION NOT NULL,
    "message" TEXT NOT NULL,
    "acknowledgedById" UUID,
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "servers_environmentId_idx" ON "servers"("environmentId");

-- CreateIndex
CREATE INDEX "servers_status_idx" ON "servers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "servers_environmentId_name_key" ON "servers"("environmentId", "name");

-- CreateIndex
CREATE INDEX "applications_environmentId_idx" ON "applications"("environmentId");

-- CreateIndex
CREATE UNIQUE INDEX "applications_serverId_name_key" ON "applications"("serverId", "name");

-- CreateIndex
CREATE INDEX "metrics_serverId_recordedAt_idx" ON "metrics"("serverId", "recordedAt");

-- CreateIndex
CREATE INDEX "alert_rules_serverId_idx" ON "alert_rules"("serverId");

-- CreateIndex
CREATE INDEX "alerts_status_idx" ON "alerts"("status");

-- CreateIndex
CREATE INDEX "alerts_serverId_createdAt_idx" ON "alerts"("serverId", "createdAt");

-- CreateIndex
CREATE INDEX "alerts_ruleId_idx" ON "alerts"("ruleId");

-- AddForeignKey
ALTER TABLE "servers" ADD CONSTRAINT "servers_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "environments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "environments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metrics" ADD CONSTRAINT "metrics_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "alert_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_acknowledgedById_fkey" FOREIGN KEY ("acknowledgedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
