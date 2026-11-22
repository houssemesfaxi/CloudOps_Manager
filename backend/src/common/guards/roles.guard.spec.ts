import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);

  const contextFor = (role: Role) =>
    ({
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: '1', email: 'a@b.c', role } }),
      }),
    }) as unknown as ExecutionContext;

  it('lets anyone through when no @Roles is set', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(contextFor(Role.VIEWER))).toBe(true);
  });

  it('allows a listed role', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Role.ADMIN, Role.DEVOPS]);
    expect(guard.canActivate(contextFor(Role.DEVOPS))).toBe(true);
  });

  it('blocks a role that is not listed', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    expect(guard.canActivate(contextFor(Role.VIEWER))).toBe(false);
  });
});
