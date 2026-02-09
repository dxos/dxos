//
// Copyright 2024 DXOS.org
//

import { SubscriptionList, UpdateScheduler, scheduleTask } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf/stream';
import { type MemberInfo } from '@dxos/credentials';
import { type SpaceManager } from '@dxos/echo-pipeline';
import { PublicKey } from '@dxos/keys';
import { type Client, create } from '@dxos/protocols';
import {
  type Contact,
  type ContactBook,
  ContactBookSchema,
  ContactSchema,
} from '@dxos/protocols/buf/dxos/client/services_pb';
import { ComplexMap, ComplexSet } from '@dxos/util';

import { type DataSpaceManager } from '../spaces';

import { type IdentityManager } from './identity-manager';

export class ContactsServiceImpl implements Client.ContactsService {
  constructor(
    private readonly _identityManager: IdentityManager,
    private readonly _spaceManager: SpaceManager,
    private readonly _dataSpaceManagerProvider: () => Promise<DataSpaceManager>,
  ) {}

  async getContacts(): Promise<ContactBook> {
    const identity = this._identityManager.identity;
    if (identity == null) {
      return create(ContactBookSchema, { contacts: [] });
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
          existing.profile ??= memberInfo.profile as any;
          existing.commonSpaces?.push(spaceKey as any);
        } else {
          acc.set(
            memberInfo.key,
            create(ContactSchema, {
              identityKey: memberInfo.key as any,
              profile: memberInfo.profile as any,
              commonSpaces: [spaceKey as any],
            }),
          );
        }
        return acc;
      }, new ComplexMap<PublicKey, Contact>(PublicKey.hash));
    return create(ContactBookSchema, {
      contacts: [...contacts.values()],
    });
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
    });
  }
}
