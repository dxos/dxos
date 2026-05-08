//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Database, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { AutomationCapabilities } from '@dxos/plugin-automation/types';
import { Integration } from '@dxos/plugin-integration/types';

import { meta } from '#meta';

import { SyncContacts } from './definitions';

const dispatch = (integration: Integration.Integration) =>
  Effect.gen(function* () {
    const computeRuntime = yield* Capability.get(AutomationCapabilities.ComputeRuntime);
    const db = Obj.getDatabase(integration);
    invariant(db);
    const runtime = computeRuntime.getRuntime(db.spaceId);
    const { ContactsFunctions } = yield* Effect.promise(() => import('./google/people'));
    yield* Effect.tryPromise(() =>
      runtime.runPromise(
        Operation.invoke(ContactsFunctions.Sync, {
          integration: Ref.make(integration),
        }),
      ),
    ).pipe(
      Effect.catchAll((error) => {
        log.catch(error);
        return Operation.invoke(LayoutOperation.AddToast, {
          id: `${meta.id}/sync-contacts-error`,
          icon: 'ph--warning--regular',
          duration: 5_000,
          title: ['sync-contacts-error.title', { ns: meta.id }],
          closeLabel: ['close.label', { ns: meta.id }],
        });
      }),
    );
  });

const handler: Operation.WithHandler<typeof SyncContacts> = SyncContacts.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const integrationObj = yield* Database.load(input.integration).pipe(
        Effect.provide(Database.layer(Obj.getDatabase(input.integration.target!)!)),
      );

      yield* dispatch(integrationObj);

      yield* Operation.invoke(LayoutOperation.AddToast, {
        id: `${meta.id}/sync-contacts-success`,
        icon: 'ph--check--regular',
        duration: 3_000,
        title: ['sync-contacts-success.title', { ns: meta.id }],
        closeLabel: ['close.label', { ns: meta.id }],
      });
    }),
  ),
);

export default handler;
