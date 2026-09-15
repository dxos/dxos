//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Trigger from '@dxos/compute/Trigger';
import { Database, Ref } from '@dxos/echo';
import { makeRoutine } from '@dxos/plugin-routine';
import type * as RoutineCapabilities from '@dxos/plugin-routine/RoutineCapabilities';
import { AI_ACTION_ICON } from '@dxos/ui-types';

import * as InboxOperation from '../types/InboxOperation.ts';
import * as Mailbox from '../types/Mailbox.ts';

/** Default cron for the cascade (daily, early); the user edits the schedule on the trigger. */
const DEFAULT_CRON = '0 6 * * *';

const Input = Schema.Struct({
  mailbox: Ref.Ref(Mailbox.Mailbox).annotate({ title: 'Mailbox' }),
});

/**
 * "Analyze Mailbox" automation template: a routine binding {@link InboxOperation.AnalyzeMailbox}
 * directly (kind: runnable) on a timer trigger — no model sits between the trigger and the cascade.
 *
 * The unattended counterpart to the mailbox toolbar's Analyze action. Every tier the cascade spawns
 * keeps its own durable cursor, so a firing catches up on whatever arrived since the last one and
 * an extra firing costs nothing; the LLM tier stays batch-capped per run either way.
 */
export const analyzeMailbox: RoutineCapabilities.Template = {
  id: 'org.dxos.routine.analyzeMailbox',
  label: 'Analyze Mailbox',
  icon: AI_ACTION_ICON,
  inputSchema: Input,
  scaffold: ({ name, input }) =>
    Effect.gen(function* () {
      if (!Ref.isRef(input?.mailbox)) {
        return yield* Effect.fail(new Error('Analyze Mailbox template requires a mailbox.'));
      }
      const mailbox = yield* Database.resolve(input.mailbox, Mailbox.Mailbox);

      return makeRoutine({
        name: name ?? `Analyze — ${mailbox.name ?? 'Mailbox'}`,
        spec: { kind: 'runnable', runnable: Ref.fromURI(InboxOperation.AnalyzeMailbox.meta.key) },
        trigger: Trigger.make({
          enabled: true,
          spec: Trigger.specTimer(DEFAULT_CRON),
          // Resolved at scaffold time so the routine's input is inspectable; an unnamed mailbox
          // yields none and the cascade reports the correspondent stage as skipped.
          input: { mailbox: Ref.make(mailbox), me: Mailbox.identityAddresses(mailbox) },
          concurrency: 1,
        }),
      });
    }),
};
