//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Trigger from '@dxos/compute/Trigger';
import { Database, Ref } from '@dxos/echo';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import { makeRoutine } from '@dxos/plugin-routine';
import type * as RoutineCapabilities from '@dxos/plugin-routine/RoutineCapabilities';

import { CrmOperation } from '#types';

const Input = Schema.Struct({
  mailbox: Ref.Ref(Mailbox.Mailbox).annotate({ title: 'Mailbox' }),
});

/**
 * CRM automation template: the routine-only counterpart of the `crmPipeline` project template.
 */
export const crm: RoutineCapabilities.Template = {
  id: 'org.dxos.routine.crm',
  label: 'CRM',
  icon: 'ph--address-book--regular',
  inputSchema: Input,
  scaffold: ({ name, input }) =>
    Effect.gen(function* () {
      if (!Ref.isRef(input?.mailbox)) {
        return yield* Effect.fail(new Error('CRM template requires a mailbox.'));
      }
      const mailbox = yield* Database.resolve(input.mailbox, Mailbox.Mailbox);

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
