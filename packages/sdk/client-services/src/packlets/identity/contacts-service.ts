//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as EffectStream from 'effect/Stream';

import { SubscriptionList, UpdateScheduler, scheduleTask } from '@dxos/async';
import { Context } from '@dxos/context';
import { type MemberInfo } from '@dxos/credentials';
import { type SpaceManager } from '@dxos/echo-host';
import { PublicKey } from '@dxos/keys';
import { type Contact, type ContactBook } from '@dxos/protocols/proto/dxos/client/services';
import { type ContactsService } from '@dxos/protocols/rpc';
import { ComplexMap, ComplexSet } from '@dxos/util';

import { type DataSpaceManager } from '../spaces';
import { type IdentityManager } from './identity-manager';

export class ContactsServiceImpl implements ContactsService.Handlers {
  constructor(
    private readonly _identityManager: IdentityManager,
    private readonly _spaceManager: SpaceManager,
    private readonly _dataSpaceManagerProvider: () => Promise<DataSpaceManager>,
  ) {}

  ['ContactsService.getContacts'](): Effect.Effect<ContactBook, Error> {
    return Effect.sync(() => this.#getContacts());
  }

  ['ContactsService.queryContacts'](): EffectStream.Stream<ContactBook, Error> {
    const subscribedSpaceKeySet = new ComplexSet(PublicKey.hash);
    return EffectStream.async<ContactBook, Error>((emit) => {
      const ctx = Context.default();
      const pushUpdateTask = new UpdateScheduler(
        ctx,
        async () => {
          void emit.single(this.#getContacts());
        },
        { maxFrequency: 2 },
      );
      scheduleTask(ctx, async () => {
        const subscriptions = new SubscriptionList();
        ctx.onDispose(() => subscriptions.clear());
        const subscribeToSpaceAndUpdate = () => {
          const oldSetSize = subscribedSpaceKeySet.size;
          for (const space of this._spaceManager.spaces.values()) {
            if (!subscribedSpaceKeySet.has(space.key)) {
              subscriptions.add(space.stateUpdate.on(ctx, () => pushUpdateTask.trigger()));
              subscribedSpaceKeySet.add(space.key);
            }
          }
          if (oldSetSize !== subscribedSpaceKeySet.size) {
            pushUpdateTask.trigger();
          }
        };
        const unsubscribe = (await this._dataSpaceManagerProvider()).updated.on(ctx, subscribeToSpaceAndUpdate);
        ctx.onDispose(unsubscribe);
        subscribeToSpaceAndUpdate();
      });
      return Effect.promise(() => ctx.dispose());
    });
  }

  #getContacts(): ContactBook {
    const identity = this._identityManager.identity;
    if (identity == null) {
      return { contacts: [] };
    }
    const contacts = [...this._spaceManager.spaces.values()]
      .flatMap((s) => [...s.spaceState.members.values()].map((m) => [s.key, m]))
      .reduce((acc, v) => {
        const [spaceKey, memberInfo] = v as [PublicKey, MemberInfo];
        if (memberInfo.key.equals(identity.identityKey)) {
          return acc;
        }
        const existing = acc.get(memberInfo.key);
        if (existing != null) {
          existing.profile ??= memberInfo.profile;
          existing.commonSpaces?.push(spaceKey);
        } else {
          acc.set(memberInfo.key, {
            identityKey: memberInfo.key,
            profile: memberInfo.profile,
            commonSpaces: [spaceKey],
          });
        }
        return acc;
      }, new ComplexMap<PublicKey, Contact>(PublicKey.hash));
    return {
      contacts: [...contacts.values()],
    };
  }
}
