//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as EffectStream from 'effect/Stream';

import { SubscriptionList, UpdateScheduler, scheduleTask } from '@dxos/async';
import { Context } from '@dxos/context';
import { type MemberInfo, createDidFromIdentityKey } from '@dxos/credentials';
import { EffectEx } from '@dxos/effect';
import { PublicKey } from '@dxos/keys';
import { buf, fromPublicKey } from '@dxos/protocols/buf';
import {
  type Contact,
  type ContactBook,
  ContactBookSchema,
  ContactSchema,
} from '@dxos/protocols/buf/dxos/client/services_pb';
import { ContactsService } from '@dxos/protocols/rpc';
import { ComplexMap, ComplexSet } from '@dxos/util';

import * as IdentityContract from '../../contracts/identity.ts';
import * as SpacesContract from '../../contracts/spaces.ts';
import * as Readiness from '../../Readiness.ts';
import { type SpaceManager, SpaceManagerService } from '../space/index.ts';

export class ContactsServiceImpl implements ContactsService.Handlers {
  'constructor'(
    private readonly _identityManager: IdentityContract.Manager,
    private readonly _spaceManager: SpaceManager,
    private readonly _dataSpaceManagerProvider: () => Promise<SpacesContract.Manager>,
  ) {}

  ['ContactsService.getContacts'](): Effect.Effect<ContactBook, Error> {
    return Effect.promise(() => this.#getContacts());
  }

  ['ContactsService.queryContacts'](): EffectStream.Stream<ContactBook, Error> {
    const subscribedSpaceKeySet = new ComplexSet(PublicKey.hash);
    return EffectEx.streamFromEmitter<ContactBook, Error>((emit) => {
      const ctx = Context.default();
      const pushUpdateTask = new UpdateScheduler(
        ctx,
        async () => {
          void emit.single(await this.#getContacts());
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

  async #getContacts(): Promise<ContactBook> {
    const identity = this._identityManager.identity;
    if (identity == null) {
      return buf.create(ContactBookSchema, { contacts: [] });
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
          existing.commonSpaces.push(fromPublicKey(spaceKey));
        } else {
          acc.set(
            memberInfo.key,
            buf.create(ContactSchema, {
              identityKey: fromPublicKey(memberInfo.key),
              profile: memberInfo.profile,
              commonSpaces: [fromPublicKey(spaceKey)],
            }),
          );
        }
        return acc;
      }, new ComplexMap<PublicKey, Contact>(PublicKey.hash));
    // Derived here (and cached by key) so clients can show the DID without hashing each key themselves.
    await Promise.all(
      [...contacts.entries()].map(async ([identityKey, contact]) => {
        contact.did = await createDidFromIdentityKey(identityKey);
      }),
    );
    return buf.create(ContactBookSchema, { contacts: [...contacts.values()] });
  }
}

export const ContactsServiceLayer = Layer.effect(
  ContactsService.Tag,
  Effect.gen(function* () {
    const identityManager = yield* IdentityContract.ManagerService;
    const spaceManager = yield* SpaceManagerService;
    const dataSpaceManager = yield* SpacesContract.ManagerService;
    const readiness = yield* Readiness.StackReadinessService;
    return new ContactsServiceImpl(identityManager, spaceManager, () =>
      readiness.initialized.wait().then(() => dataSpaceManager),
    );
  }),
);
