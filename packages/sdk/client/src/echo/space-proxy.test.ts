//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import { describe, expect, onTestFinished, test } from 'vitest';

import { type ClientServicesProvider, type ClientServicesRpc } from '@dxos/client-protocol';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';

import { Client } from '../client';
import { TestBuilder } from '../testing';

/** Longer than the 2s budget the edge-replication echo used to get, shorter than the RPC budget. */
const SNAPSHOT_DELAY = 3_000;

/**
 * Delays every `querySpaces` snapshot while `delaying()` holds, standing in for the real backlog:
 * snapshots reach the proxy behind every other space's `_processSpaceUpdate`, which is synchronized
 * and awaits the database opening on first init.
 */
const withDelayedSpaceSnapshots = (inner: ClientServicesProvider, delaying: () => boolean): ClientServicesProvider =>
  new Proxy(inner, {
    get: (target, property, receiver) =>
      property === 'rpc' ? withDelayedQuerySpaces(target.rpc, delaying) : Reflect.get(target, property, receiver),
  });

const withDelayedQuerySpaces = (rpc: ClientServicesRpc, delaying: () => boolean): ClientServicesRpc =>
  new Proxy(rpc, {
    get: (target, property, receiver) => {
      if (property !== 'SpacesService') {
        return Reflect.get(target, property, receiver);
      }
      // Proxied rather than spread so the overloaded `querySpaces` signature is preserved.
      return new Proxy(target.SpacesService, {
        get: (service, method, serviceReceiver) =>
          method === 'querySpaces'
            ? // `SpaceList` calls this with no options; declaring that shape pins the `asMailbox`
              // overload to its stream branch.
              (...args: Parameters<typeof service.querySpaces<false, false>>) =>
                service
                  .querySpaces<false, false>(...args)
                  .pipe(
                    Stream.mapEffect((snapshot) =>
                      delaying() ? Effect.sleep(SNAPSHOT_DELAY).pipe(Effect.as(snapshot)) : Effect.succeed(snapshot),
                    ),
                  )
            : Reflect.get(service, method, serviceReceiver),
      });
    },
  });

describe('SpaceProxy', () => {
  // The `updateSpace` RPC commits the setting on the host; the wait that follows is only the local
  // snapshot catching up. Failing it on a 2s deadline turned an ordinary backlog into a rejection
  // that reached `SpaceOperation.Create` as a defect, leaving Composer's create-space dialog open
  // with no error (~1 in 12 locally).
  test('setting the edge replication preference survives a snapshot echo slower than 2s', async () => {
    const testBuilder = new TestBuilder();
    onTestFinished(() => testBuilder.destroy());

    let delaying = false;
    const services = withDelayedSpaceSnapshots(testBuilder.createLocalClientServices(), () => delaying);
    await using client = await new Client({ services }).initialize();
    await client.halo.createIdentity();

    const space = await client.spaces.create();
    await space.waitUntilReady();

    delaying = true;
    await space.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED);
    delaying = false;

    expect(space.internal.data.edgeReplication).toBe(EdgeReplicationSetting.ENABLED);
  }, 30_000);
});
