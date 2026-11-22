import { Prisma } from '@prisma/client';

/** Sent with every application: its server, its environment and its project. */
export const applicationInclude = {
  server: { select: { id: true, name: true, status: true } },
  environment: {
    select: {
      id: true,
      name: true,
      type: true,
      project: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.ApplicationInclude;

export type ApplicationWithRelations = Prisma.ApplicationGetPayload<{
  include: typeof applicationInclude;
}>;
