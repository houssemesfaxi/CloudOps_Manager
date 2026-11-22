import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Restricts a route to some roles, e.g. @Roles(Role.ADMIN, Role.DEVOPS).
 * Without @Roles, any logged-in user can call the route.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
