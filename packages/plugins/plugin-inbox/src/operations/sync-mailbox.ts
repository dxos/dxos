//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';
import { AutomationCapabilities } from '@dxos/plugin-automation/types';
import { Integration } from '@dxos/plugin-integration/types';

import { meta } from '#meta';

import { Mailbox } from '../types';

import { SyncMailbox } from './definitions';

/**
 * Runs Gmail sync against a single Mailbox via the compute runtime. Always
 * scoped to the wrapping Integration: the inner `GoogleMailSync` op pulls
 * its access token off `integration.accessToken`, and per-target sync state
 * (cursor / lastSyncAt / lastError) lives on `integration.targets[…]`.
 *
 * Errors surface as a toast; failure is logged but doesn't propagate so the
 * caller (per-mailbox graph action or integration-level fan-out below) can
 * keep going.
 */
const syncOne = (integration: Integration.Integration, mailbox: Mailbox.Mailbox) =>
  Effect.gen(function* () {
    const computeRuntime = yield* Capability.get(AutomationCapabilities.ComputeRuntime);
    const db = Obj.getDatabase(mailbox);
    invariant(db);
    const runtime = computeRuntime.getRuntime(db.spaceId);
    const { GmailFunctions } = yield* Effect.promise(() => import('./google/gmail'));
    yield* Effect.tryPromise(() =>
      runtime.runPromise(
        Operation.invoke(GmailFunctions.Sync, {
          integration: Ref.make(integration),
          mailbox: Ref.make(mailbox),
        }),
      ),
    ).pipe(
      Effect.catchAll((error) => {
        log.catch(error);
        return Operation.invoke(LayoutOperation.AddToast, {
          id: `${meta.id}/sync-mailbox-error`,
          icon: 'ph--warning--regular',
          duration: 5_000,
          title: ['sync-mailbox-error.title', { ns: meta.id }],
          closeLabel: ['close.label', { ns: meta.id }],
        });
      }),
    );
  });

const handler: Operation.WithHandler<typeof SyncMailbox> = SyncMailbox.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      // Resolve to (integration, mailbox[]) pairs. Both entry points end up
      // here; the per-mailbox entry queries for the parent Integration so the
      // inner sync can always source credentials the same way.
      const pairs: Array<{ integration: Integration.Integration; mailbox: Mailbox.Mailbox }> = [];
      if ('mailbox' in input) {
        const db = Obj.getDatabase(input.mailbox);
        if (!db) {
          log.warn('mailbox has no database; skipping sync', { mailbox: input.mailbox.id });
        } else {
          const integrations = yield* Effect.promise(() =>
            db.query(Filter.type(Integration.Integration)).run(),
          );
          const parent = integrations.find((integration) =>
            integration.targets.some(
              (target) => target.object?.dxn.asEchoDXN()?.echoId === input.mailbox.id,
            ),
          );
          if (!parent) {
            log.warn('no parent Integration found for mailbox; skipping sync', { mailbox: input.mailbox.id });
          } else {
            pairs.push({ integration: parent, mailbox: input.mailbox });
          }
        }
      } else {
        const integrationObj = yield* Database.load(input.integration).pipe(
          Effect.provide(Database.layer(Obj.getDatabase(input.integration.target!)!)),
        );
        for (const target of integrationObj.targets ?? []) {
          const mb = target.object?.target;
          if (mb && Obj.instanceOf(Mailbox.Mailbox, mb)) {
            pairs.push({ integration: integrationObj, mailbox: mb as Mailbox.Mailbox });
          }
        }
      }

      for (const { integration, mailbox } of pairs) {
        yield* syncOne(integration, mailbox);
      }

      // Success toast — fired regardless of how many mailboxes synced
      // (per-mailbox failures already toasted via `syncOne`'s catchAll).
      yield* Operation.invoke(LayoutOperation.AddToast, {
        id: `${meta.id}/sync-mailbox-success`,
        icon: 'ph--check--regular',
        duration: 3_000,
        title: ['sync-mailbox-success.title', { ns: meta.id }],
        closeLabel: ['close.label', { ns: meta.id }],
      });
    }),
  ),
);

export default handler;
