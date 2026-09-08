//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { PushStream } from '@dxos/async';
import { Context } from '@dxos/context';
import { Invitation, Invitation_State } from '@dxos/protocols/buf/dxos/client/invitation_pb';

import { type FlowLockHolder, createGuardedInvitationState } from './invitation-state';

const setup = () => {
  const ctx = new Context();
  const stream = new PushStream<Invitation>();
  const invitation = { state: Invitation_State.INIT } as Invitation;
  return { ctx, guarded: createGuardedInvitationState(ctx, invitation, stream) };
};

/** A connection's flow-lock holder; `hasLock` models whether it currently drives the flow. */
const holder = (hasLock = false): FlowLockHolder & { hasLock: boolean } => ({
  hasLock,
  hasFlowLock() {
    return this.hasLock;
  },
});

describe('GuardedInvitationState', () => {
  test('a live connection advances the flow', () => {
    const { guarded } = setup();
    const connection = holder(true);

    expect(guarded.set(connection, Invitation_State.CONNECTING)).toBe(true);
    expect(guarded.set(connection, Invitation_State.CONNECTED)).toBe(true);
    expect(guarded.current.state).toBe(Invitation_State.CONNECTED);
  });

  // Regression (DX-1264): an edge drop mid-invitation leaves a superseded connection whose teardown
  // still writes `CONNECTING`. If that lands behind the live connection, the live guest's
  // `introduce` — which asserts CONNECTED — errors the whole invitation instead of proceeding.
  test('a superseded connection cannot rewind the live one', () => {
    const { guarded } = setup();
    const dropped = holder(true);
    const live = holder(false);

    guarded.set(dropped, Invitation_State.CONNECTING);
    guarded.set(dropped, Invitation_State.CONNECTED);

    // The edge drops: `dropped` loses the flow lock and `live` takes over on a fresh connection.
    dropped.hasLock = false;
    live.hasLock = true;
    guarded.set(live, Invitation_State.CONNECTING);
    guarded.set(live, Invitation_State.CONNECTED);
    expect(guarded.current.state).toBe(Invitation_State.CONNECTED);

    // `dropped`'s connection context disposes only now, and rewinds to CONNECTING.
    guarded.set(dropped, Invitation_State.CONNECTING);
    expect(guarded.current.state).toBe(Invitation_State.CONNECTED);
  });
});
