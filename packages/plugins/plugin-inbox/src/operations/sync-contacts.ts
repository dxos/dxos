//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Database, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Integration } from '@dxos/plugin-integration';

import { meta } from '#meta';

import { IntegrationDatabaseMissingError } from '../errors';
import { InboxOperation } from '../types';

const dispatch = (integration: Integration.Integration) =>
  Effect.gen(function* () {
    const db = Obj.getDatabase(integration);
    invariant(db);
    const { ContactsFunctions } = yield* Effect.promise(() => import('./google/contacts'));
    yield* Operation.invoke(
      ContactsFunctions.Sync,
      {
        integration: Ref.make(integration),
      },
      { spaceId: db.spaceId },
    );
  });

const handler: Operation.WithHandler<typeof InboxOperation.SyncContacts> = InboxOperation.SyncContacts.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const target = input.integration.target;
      const db = target ? Obj.getDatabase(target) : undefined;
      if (!db) {
        return yield* Effect.fail(new IntegrationDatabaseMissingError());
      }

      const integrationObj = yield* Database.load(input.integration).pipe(Effect.provide(Database.layer(db)));

      yield* dispatch(integrationObj).pipe(
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
