import { Prisma } from '@prisma/client';
import { userSummarySelect } from '../users/user.select';

const userSummary = { select: userSummarySelect };

/** One project in a list: its creator and how many members/environments it has. */
export const projectListInclude = {
  createdBy: userSummary,
  _count: { select: { members: true, environments: true } },
} satisfies Prisma.ProjectInclude;

/** One project with its team and its environments (GET /projects/:id). */
export const projectDetailInclude = {
  createdBy: userSummary,
  members: {
    select: { id: true, projectRole: true, joinedAt: true, user: userSummary },
    orderBy: { joinedAt: 'asc' },
  },
  environments: {
    include: { _count: { select: { servers: true, applications: true } } },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  },
} satisfies Prisma.ProjectInclude;

export const memberSelect = {
  id: true,
  projectRole: true,
  joinedAt: true,
  user: userSummary,
} satisfies Prisma.ProjectMemberSelect;

export type ProjectListItem = Prisma.ProjectGetPayload<{
  include: typeof projectListInclude;
}>;
export type ProjectDetail = Prisma.ProjectGetPayload<{
  include: typeof projectDetailInclude;
}>;
export type ProjectMemberItem = Prisma.ProjectMemberGetPayload<{
  select: typeof memberSelect;
}>;
