//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { LayoutOperation, SyncDatabaseMissingError } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Cursor } from '@dxos/cursor';
import { type Database, Obj, type Ref } from '@dxos/echo';
import { log } from '@dxos/log';

import { meta } from '#meta';

import { InboxOperation } from '../types';

const dispatch = (bindingRef: Ref.Ref<Cursor.Cursor>, db: Database.Database) =>
  Effect.gen(function* () {
    const { ContactsFunctions } = yield* Effect.promise(() => import('./google/contacts'));
    yield* Operation.invoke(
      ContactsFunctions.Sync,
      {
        binding: bindingRef,
      },
      { spaceId: db.spaceId },
    );
  });

const handler: Operation.WithHandler<typeof InboxOperation.SyncContacts> = InboxOperation.SyncContacts.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const target = input.binding.target;
      const db = target ? Obj.getDatabase(target) : undefined;
      if (!db) {
        return yield* Effect.fail(new SyncDatabaseMissingError());
      }

      yield* dispatch(input.binding, db).pipe(
        Effect.tap(() =>
          Operation.invoke(LayoutOperation.AddToast, {
            id: `${meta.profile.key}/sync-contacts-success`,
            icon: 'ph--check--regular',
            duration: 3_000,
            title: ['sync-contacts-success.title', { ns: meta.profile.key }],
            closeLabel: ['close.label', { ns: meta.profile.key }],
          }),
        ),
        Effect.catchAll((error) => {
          log.catch(error);
          return Operation.invoke(LayoutOperation.AddToast, {
            id: `${meta.profile.key}/sync-contacts-error`,
            icon: 'ph--warning--regular',
            duration: 5_000,
            title: ['sync-contacts-error.title', { ns: meta.profile.key }],
            closeLabel: ['close.label', { ns: meta.profile.key }],
          });
        }),
      );
    }),
  ),
);

export default handler;
