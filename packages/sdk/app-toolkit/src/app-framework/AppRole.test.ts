//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { SpaceInvitationMessage } from '@dxos/types';

import { AppSurface } from '../ui/index.ts';
import * as AppRole from './AppRole.ts';

describe('AppRole', () => {
  test('AppSurface exposes the same tokens', ({ expect }) => {
    expect(AppSurface.Article).toBe(AppRole.Article);
    expect(AppSurface.CardContent).toBe(AppRole.CardContent);
  });

  test('space invitation role matches the message block role', ({ expect }) => {
    expect(AppRole.SpaceInvitation.role).toBe(SpaceInvitationMessage.SPACE_INVITATION_ROLE);
  });
});
