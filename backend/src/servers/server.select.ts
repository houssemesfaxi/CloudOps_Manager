import { Prisma } from '@prisma/client';

/** Sent with every server: its environment, its project and its number of applications. */
export const serverInclude = {
  environment: {
    select: {
      id: true,
      name: true,
      type: true,
      project: { select: { id: true, name: true } },
    },
  },
  _count: { select: { applications: true } },
} satisfies Prisma.ServerInclude;

export type ServerWithRelations = Prisma.ServerGetPayload<{
  include: typeof serverInclude;
}>;
