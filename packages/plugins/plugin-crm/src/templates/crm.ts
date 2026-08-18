//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Trigger from '@dxos/compute/Trigger';
import { Database, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import { makeRoutine } from '@dxos/plugin-routine';
import type * as RoutineCapabilities from '@dxos/plugin-routine/RoutineCapabilities';

import { CrmOperation } from '#types';

/**
 * CRM automation template: the routine-only counterpart of the `crmPipeline` project template. The
 * trigger binds `ProcessMailbox` directly (kind: runnable) so the loop is deterministic — no model
 * between trigger and operation. The operation's durable feed cursor plus the identity index make
 * per-item firing idempotent: each firing catches up on everything new and extra firings process
 * nothing. Only applies to a Mailbox subject — the feed trigger needs `mailbox.feed`.
 */
export const crm: RoutineCapabilities.Template = {
  id: 'org.dxos.routine.crm',
  label: 'CRM',
  icon: 'ph--address-book--regular',
  appliesTo: (subject) => subject != null && Obj.instanceOf(Mailbox.Mailbox, subject),
  scaffold: ({ name, subject }) =>
    Effect.gen(function* () {
      invariant(
        subject != null && Obj.instanceOf(Mailbox.Mailbox, subject),
        'CRM template requires a Mailbox subject.',
      );
      const mailbox = subject;

      // The feed spec requires the live feed object; Database.load is a read-only DB operation.
      const feed = yield* Database.load(mailbox.feed);
      return makeRoutine({
        name: name ?? `CRM — ${mailbox.name ?? 'Mailbox'}`,
        spec: { kind: 'runnable', runnable: Ref.fromURI(CrmOperation.ProcessMailbox.meta.key) },
        trigger: Trigger.make({
          enabled: true,
          spec: Trigger.specFeed(feed),
          // The operation reads the mailbox itself, so the trigger passes the subject rather than the
          // event item; `research` scaffolds a Profile per new contact.
          input: { mailbox: Ref.make(mailbox), research: true },
          concurrency: 1,
        }),
      });
    }),
};
