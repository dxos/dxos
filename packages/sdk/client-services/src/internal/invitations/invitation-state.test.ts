//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Invitation_State } from '@dxos/protocols/buf/dxos/client/invitation_pb';

import { getInvitationOutcome } from './invitation-state.ts';

describe('getInvitationOutcome', () => {
  test('names the terminal state a flow reached', ({ expect }) => {
    expect(getInvitationOutcome(Invitation_State.SUCCESS)).toBe('success');
    expect(getInvitationOutcome(Invitation_State.TIMEOUT)).toBe('timeout');
    expect(getInvitationOutcome(Invitation_State.ERROR)).toBe('error');
    expect(getInvitationOutcome(Invitation_State.CANCELLED)).toBe('cancelled');
  });

  test('calls a flow disposed before any terminal state closed', ({ expect }) => {
    expect(getInvitationOutcome(Invitation_State.CONNECTING)).toBe('closed');
    expect(getInvitationOutcome(Invitation_State.AUTHENTICATING)).toBe('closed');
  });
});
