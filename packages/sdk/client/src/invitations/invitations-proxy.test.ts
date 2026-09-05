//
// Copyright 2026 DXOS.org
//

import { afterEach, describe, expect, test, vi } from 'vitest';

import { Stream } from '@dxos/async';
import type { ClientServices } from '@dxos/client-protocol';
import { buf } from '@dxos/protocols/buf';
import { Invitation_Kind } from '@dxos/protocols/buf/dxos/client/invitation_pb';
import { QueryInvitationsResponse, QueryInvitationsResponse_Action, QueryInvitationsResponse_Type, QueryInvitationsResponseSchema } from '@dxos/protocols/buf/dxos/client/services_pb';

import { InvitationsProxy } from './invitations-proxy';

type InvitationsService = NonNullable<ClientServices['InvitationsService']>;

const notCalled = (method: string) => (): never => {
  throw new Error(`unexpected call: ${method}`);
};

const makeProxy = (queryInvitations: InvitationsService['queryInvitations']) => {
  const service: InvitationsService = {
    queryInvitations,
    createInvitation: notCalled('createInvitation'),
    acceptInvitation: notCalled('acceptInvitation'),
    authenticate: notCalled('authenticate'),
    cancelInvitation: notCalled('cancelInvitation'),
  };

  return new InvitationsProxy(service, undefined, () => ({ kind: Invitation_Kind.SPACE }));
};

describe('InvitationsProxy', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test('opens once the initial snapshot arrives', async () => {
    const proxy = makeProxy(
      () =>
        new Stream<QueryInvitationsResponse>(({ next }) => {
          next(
            buf.create(QueryInvitationsResponseSchema, {
              action: QueryInvitationsResponse_Action.ADDED,
              type: QueryInvitationsResponse_Type.CREATED,
              invitations: [],
              existing: true,
            }),
          );
          next(
            buf.create(QueryInvitationsResponseSchema, {
              action: QueryInvitationsResponse_Action.ADDED,
              type: QueryInvitationsResponse_Type.ACCEPTED,
              invitations: [],
              existing: true,
            }),
          );
          next(
            buf.create(QueryInvitationsResponseSchema, {
              action: QueryInvitationsResponse_Action.LOAD_COMPLETE,
              type: QueryInvitationsResponse_Type.CREATED,
            }),
          );
        }),
    );

    await proxy.open();
    expect(proxy.isOpen).toBe(true);
  });

  // The client initialization path awaits this, so hanging here made the app unbootable.
  test('opens when the stream fails before the initial snapshot', async () => {
    const proxy = makeProxy(
      () => new Stream<QueryInvitationsResponse>(({ close }) => close(new Error('stream failed'))),
    );

    await proxy.open();
    expect(proxy.isOpen).toBe(true);
  });

  test('opens when the stream closes before the initial snapshot', async () => {
    const proxy = makeProxy(() => new Stream<QueryInvitationsResponse>(({ close }) => close()));

    await proxy.open();
    expect(proxy.isOpen).toBe(true);
  });

  test('opens when the stream never delivers the initial snapshot', async () => {
    vi.useFakeTimers();
    const proxy = makeProxy(() => new Stream<QueryInvitationsResponse>(() => {}));

    const opened = proxy.open();
    await vi.advanceTimersByTimeAsync(30_000);
    await opened;
    expect(proxy.isOpen).toBe(true);
  });
});
