//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Database, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Integration } from '@dxos/plugin-integration';

import { meta } from '#meta';

import { IMAP_PROVIDER_ID } from '../constants';
import { InboxOperation, Mailbox } from '../types';

const syncOne = (integration: Integration.Integration, mailbox: Mailbox.Mailbox) =>
  Effect.gen(function* () {
    const db = Obj.getDatabase(mailbox);
    invariant(db);

    // Dispatch on the integration's providerId so non-Gmail integrations
    // (currently IMAP, native-only) route to the right sync handler.
    const syncOperation =
      integration.providerId === IMAP_PROVIDER_ID
        ? InboxOperation.ImapSync
        : InboxOperation.GoogleMailSync;

    return yield* Operation.invoke(syncOperation, {
      integration: Ref.make(integration),
      mailbox: Ref.make(mailbox),
    }).pipe(
      Effect.map(() => true as const),
      Effect.catchAll((error) => {
        log.catch(error);
        return Operation.invoke(LayoutOperation.AddToast, {
          id: `${meta.profile.key}/sync-mailbox-error`,
          icon: 'ph--warning--regular',
          duration: 5_000,
          title: ['sync-mailbox-error.title', { ns: meta.profile.key }],
          closeLabel: ['close.label', { ns: meta.profile.key }],
        }).pipe(Effect.as(false as const));
      }),
    );
  });

const handler: Operation.WithHandler<typeof InboxOperation.SyncMailbox> = InboxOperation.SyncMailbox.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const integrationObj = yield* Database.load(input.integration).pipe(
        Effect.provide(Database.layer(Obj.getDatabase(input.integration.target!)!)),
      );

      const pairs: Array<{ integration: Integration.Integration; mailbox: Mailbox.Mailbox }> = [];
      const mailboxRef = input.mailbox;
      if (mailboxRef) {
        const mailbox = yield* Database.load(mailboxRef);
        pairs.push({ integration: integrationObj, mailbox });
      } else {
        for (const target of integrationObj.targets ?? []) {
          if (!target.object) {
            continue;
          }
          const targetObj = yield* Database.load(target.object);
          if (!Mailbox.instanceOf(targetObj)) {
            continue;
          }
          pairs.push({ integration: integrationObj, mailbox: targetObj });
        }
      }

      let allOk = pairs.length > 0;
      for (const { integration, mailbox } of pairs) {
        const ok = yield* syncOne(integration, mailbox);
        if (!ok) {
          allOk = false;
        }
      }

      // Only show the success toast when every mailbox completed without
      // hitting the catchAll above — otherwise the failure toast emitted
      // inside syncOne is the only signal the user gets.
      if (allOk) {
        yield* Operation.invoke(LayoutOperation.AddToast, {
          id: `${meta.profile.key}/sync-mailbox-success`,
          icon: 'ph--check--regular',
          duration: 3_000,
          title: ['sync-mailbox-success.title', { ns: meta.profile.key }],
          closeLabel: ['close.label', { ns: meta.profile.key }],
        });
      }
    }),
  ),
);

export default handler;
