//
// Copyright 2026 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import { describe, test } from 'vitest';

import { Event } from '@dxos/async';
import { type ClientServicesProvider, makeDeferredClientServicesRpc } from '@dxos/client-protocol';
import * as EffectEx from '@dxos/effect/EffectEx';
import { PublicKey, SpaceId } from '@dxos/keys';
import { fromPublicKey } from '@dxos/protocols/buf';
import { SpaceState } from '@dxos/protocols/buf/dxos/client/invitation_pb';
import { QuerySpacesResponseSchema, SpaceSchema } from '@dxos/protocols/buf/dxos/client/services_pb';

import { BootCacheServices, type PendingSpace } from './boot-cache-services.ts';

const pending: PendingSpace = {
  spaceId: SpaceId.random(),
  spaceKey: PublicKey.random(),
  spaceRootUrl: 'automerge:root',
  rows: [{ documentId: 'root', heads: ['head'], bytes: new Uint8Array([1, 2, 3]) }],
};

const listing = (...states: SpaceState[]) =>
  create(QuerySpacesResponseSchema, {
    spaces: states.map((state) =>
      create(SpaceSchema, { id: pending.spaceId, spaceKey: fromPublicKey(pending.spaceKey), state }),
    ),
  });

/** A provider whose services are open and whose space list delivers `messages`; no other call is reached. */
const provider = (messages: unknown[]): ClientServicesProvider => ({
  closed: new Event(),
  rpc: makeDeferredClientServicesRpc(Effect.never, {
    'SpacesService.querySpaces': () => Stream.fromIterable(messages),
  }),
  services: {},
  open: async () => {},
  close: async () => {},
});

describe('BootCacheServices pending spaces', () => {
  test('lists a pending space as ready until the services list it as ready, then only as they do', async ({
    expect,
  }) => {
    const services = new BootCacheServices(
      provider([listing(), listing(SpaceState.SPACE_INITIALIZING), listing(SpaceState.SPACE_READY)]),
      { pendingSpaces: async () => [pending] },
    );
    await services.open();
    expect(services.isPending(pending.spaceId)).toBe(true);
    expect(services.takeWorkingSet(pending.spaceId)).toEqual(pending.rows);

    const messages = await EffectEx.runPromise(Stream.runCollect(services.rpc['SpacesService.querySpaces'](undefined)));
    expect(messages.map(({ spaces }) => spaces.map(({ id, state }) => ({ id, state })))).toEqual([
      [{ id: pending.spaceId, state: SpaceState.SPACE_READY }],
      [{ id: pending.spaceId, state: SpaceState.SPACE_READY }],
      [{ id: pending.spaceId, state: SpaceState.SPACE_READY }],
    ]);
    expect(messages[0].spaces[0].pipeline?.directoryUrl).toBe(pending.spaceRootUrl);
    expect(messages[2].spaces[0].pipeline?.directoryUrl).toBeUndefined();
    expect(services.isPending(pending.spaceId)).toBe(false);
  });

  test('opens without pending spaces that fail to load', async ({ expect }) => {
    const services = new BootCacheServices(provider([listing()]), {
      pendingSpaces: async () => {
        throw new Error('EDGE is unreachable.');
      },
    });
    await services.open();
    expect(services.isPending(pending.spaceId)).toBe(false);
  });
});
