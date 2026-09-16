//
// Copyright 2023 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import * as EffectContext from 'effect/Context';
import { afterEach, beforeEach, describe, expect, onTestFinished, test, vi } from 'vitest';

import { Trigger } from '@dxos/async';
import { Context } from '@dxos/context';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { subscribeStream } from '@dxos/protocols';
import { requirePublicKey, toPublicKey } from '@dxos/protocols/buf';
import { type Space } from '@dxos/protocols/buf/dxos/client/services_pb';
import { MembershipPolicy } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { type GossipMessage, GossipMessageSchema } from '@dxos/protocols/buf/dxos/mesh/teleport/gossip_pb';

import { type ServiceContext } from '../testing/index.ts';
import { createServiceContext } from '../testing/index.ts';
import { SpacesServiceImpl } from './spaces-service.ts';

describe('SpacesService', () => {
  let serviceContext: ServiceContext;
  let spacesService: SpacesServiceImpl;

  beforeEach(async () => {
    serviceContext = await createServiceContext();
    await serviceContext.open(new Context());
    spacesService = new SpacesServiceImpl(
      serviceContext.identityManager,
      serviceContext.spaceManager,
      serviceContext.echoHost,
      async () => {
        await serviceContext.initialized.wait();
        return serviceContext.dataSpaceManager!;
      },
    );
  });

  afterEach(async () => {
    await serviceContext.close();
  });

  describe('createSpace', () => {
    test('fails if no identity is available', async () => {
      await expect(
        EffectEx.runPromise(spacesService['SpacesService.createSpace']({ membershipPolicy: MembershipPolicy.INVITE })),
      ).rejects.toBeInstanceOf(Error);
    });

    test('creates a new space', async () => {
      await serviceContext.createIdentity();
      const space = await EffectEx.runPromise(
        spacesService['SpacesService.createSpace']({ membershipPolicy: MembershipPolicy.INVITE }),
      );
      expect(space).to.exist;
      expect(toPublicKey(space.spaceKey)).to.be.instanceof(PublicKey);
    });
  });

  describe.skip('updateSpace', () => {});

  describe('querySpaces', () => {
    test('returns empty list if no identity is available', async () => {
      const query = spacesService['SpacesService.querySpaces']();
      const result = new Trigger<Space[] | undefined>();
      const unsubscribe = subscribeStream(EffectContext.empty(), query, {
        onData: ({ spaces }) => result.wake(spaces),
      });
      onTestFinished(() => unsubscribe());
      expect(await result.wait()).to.be.length(0);
    });

    test('returns list of existing spaces', async () => {
      await serviceContext.createIdentity();
      const existingSpaces = [
        await EffectEx.runPromise(
          spacesService['SpacesService.createSpace']({ membershipPolicy: MembershipPolicy.INVITE }),
        ),
        await EffectEx.runPromise(
          spacesService['SpacesService.createSpace']({ membershipPolicy: MembershipPolicy.INVITE }),
        ),
        await EffectEx.runPromise(
          spacesService['SpacesService.createSpace']({ membershipPolicy: MembershipPolicy.INVITE }),
        ),
      ];

      const query = spacesService['SpacesService.querySpaces']();
      const result = new Trigger<Space[] | undefined>();
      const unsubscribe = subscribeStream(EffectContext.empty(), query, {
        onData: ({ spaces }) => result.wake(spaces),
      });
      onTestFinished(() => unsubscribe());

      const spaces = await result.wait();
      expect(spaces).to.be.length(3);
      expect(spaces?.map((s) => s.spaceKey)).to.deep.equal(existingSpaces?.map((s) => s.spaceKey));
    });

    test('updates when new space is added', async () => {
      await serviceContext.createIdentity();
      const query = spacesService['SpacesService.querySpaces']();
      const result = new Trigger<Space[] | undefined>();
      const unsubscribe = subscribeStream(EffectContext.empty(), query, {
        onData: ({ spaces }) => result.wake(spaces),
      });
      onTestFinished(() => unsubscribe());
      expect(await result.wait()).to.be.length(0);

      result.reset();
      const space = await EffectEx.runPromise(
        spacesService['SpacesService.createSpace']({ membershipPolicy: MembershipPolicy.INVITE }),
      );
      const spaces = await result.wait();
      expect(spaces).to.be.length(1);
      expect(toPublicKey(spaces?.[0].spaceKey)?.toHex()).to.equal(toPublicKey(space.spaceKey)?.toHex());
    });

    test.skip('updates when space is updated', async () => {});
  });

  describe('subscribeMessages', () => {
    test('signals ready only once the space listener is registered', async () => {
      await serviceContext.createIdentity();
      const created = await EffectEx.runPromise(
        spacesService['SpacesService.createSpace']({ membershipPolicy: MembershipPolicy.INVITE }),
      );
      const spaceKey = requirePublicKey(created.spaceKey);
      const space = serviceContext.dataSpaceManager?.spaces.get(spaceKey);
      invariant(space);
      const listen = vi.spyOn(space, 'listen');

      const ready = new Trigger();
      // Armed before timers freeze, so a missing ready fails within a second instead of hanging.
      const readyWait = ready.wait({ timeout: 1_000 });
      // With timers frozen, a listener registered behind a timer cannot exist yet when ready arrives.
      vi.useFakeTimers({ toFake: ['setTimeout'] });
      onTestFinished(() => {
        vi.useRealTimers();
      });
      const received = new Trigger<GossipMessage>();
      const unsubscribe = subscribeStream(
        EffectContext.empty(),
        spacesService['SpacesService.subscribeMessages']({ spaceKey, channel: 'test' }),
        {
          onData: (response) => {
            if (response._tag === 'Ready') {
              ready.wake();
            } else {
              received.wake(response.message);
            }
          },
        },
      );
      onTestFinished(() => unsubscribe());
      await readyWait;
      const deliver = listen.mock.lastCall?.[1];
      vi.useRealTimers();

      invariant(deliver, 'Ready was sent before the listener was registered.');
      const message = create(GossipMessageSchema, { channelId: 'user-channel/test' });
      deliver(message);
      expect(await received.wait({ timeout: 1_000 })).toBe(message);
    });
  });

  describe.skip('writeCrendentials', () => {});
  describe.skip('queryCrendentials', () => {});
});
