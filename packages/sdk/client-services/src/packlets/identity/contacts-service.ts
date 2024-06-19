//
// Copyright 2024 DXOS.org
//

import { EventSubscriptions, scheduleTask, UpdateScheduler } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { type MemberInfo } from '@dxos/credentials';
import type { SpaceManager } from '@dxos/echo-pipeline';
import { PublicKey } from '@dxos/keys';
import { type Contact, type ContactBook, type ContactsService } from '@dxos/protocols/proto/dxos/client/services';
import { ComplexMap, ComplexSet } from '@dxos/util';

import { type IdentityManager } from './identity-manager';
import { type DataSpaceManager } from '../spaces';

export class ContactsServiceImpl implements ContactsService {
  constructor(
    private readonly _identityManager: IdentityManager,
    private readonly _spaceManager: SpaceManager,
    private readonly _dataSpaceManagerProvider: () => Promise<DataSpaceManager>,
  ) {}

  async getContacts(): Promise<ContactBook> {
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

  queryContacts(): Stream<ContactBook> {
    const subscribedSpaceKeySet = new ComplexSet(PublicKey.hash);
    return new Stream<ContactBook>(({ next, ctx }) => {
      const pushUpdateTask = new UpdateScheduler(
        ctx,
        async () => {
          const contacts = await this.getContacts();
          next(contacts);
        },
        { maxFrequency: 2 },
      );
      scheduleTask(ctx, async () => {
        const subscriptions = new EventSubscriptions();
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
    });
  }
}
