//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Trigger from '@dxos/compute/Trigger';
import { Database, Ref } from '@dxos/echo';
import type * as RoutineCapabilities from '@dxos/plugin-routine/RoutineCapabilities';
import * as Wire from '@dxos/plugin-routine/Wire';
import { AI_ACTION_ICON } from '@dxos/ui-types';

import { InboxOperationError } from '../operations/errors.ts';
import * as InboxOperation from '../types/InboxOperation.ts';
import * as Mailbox from '../types/Mailbox.ts';

/** Default cron for the cascade (daily, early); the user edits the schedule on the trigger. */
const DEFAULT_CRON = '0 6 * * *';

/** Feed items per firing; a sync commits mail in pages, and one cascade run covers a whole page. */
const NEW_MAIL_BATCH_SIZE = Trigger.MAX_FEED_BATCH_SIZE;

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
        return yield* Effect.fail(new InboxOperationError({ message: 'Analyze Mailbox template requires a mailbox.' }));
      }
      const mailbox = yield* Database.resolve(input.mailbox, Mailbox.Mailbox);

      return Wire.makeRoutine({
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

/**
 * "Analyze New Mail" automation template: the same cascade as {@link analyzeMailbox}, fired by the
 * mailbox feed instead of a clock, so mail that a sync appends is classified and summarized as soon as
 * it lands. The cascade's own cursors make a firing over already-analyzed mail a no-op.
 */
export const analyzeNewMail: RoutineCapabilities.Template = {
  id: 'org.dxos.routine.analyzeNewMail',
  label: 'Analyze New Mail',
  icon: AI_ACTION_ICON,
  inputSchema: Input,
  scaffold: ({ name, input }) =>
    Effect.gen(function* () {
      if (!Ref.isRef(input?.mailbox)) {
        return yield* Effect.fail(
          new InboxOperationError({ message: 'Analyze New Mail template requires a mailbox.' }),
        );
      }
      const mailbox = yield* Database.resolve(input.mailbox, Mailbox.Mailbox);
      // The feed spec takes the live feed object, not its ref.
      const feed = yield* Database.load(mailbox.feed);

      return Wire.makeRoutine({
        name: name ?? `Analyze new mail — ${mailbox.name ?? 'Mailbox'}`,
        spec: { kind: 'runnable', runnable: Ref.fromURI(InboxOperation.AnalyzeMailbox.meta.key) },
        trigger: Trigger.make({
          enabled: true,
          spec: Trigger.specFeed(feed, { batchSize: NEW_MAIL_BATCH_SIZE }),
          input: { mailbox: Ref.make(mailbox), me: Mailbox.identityAddresses(mailbox) },
          concurrency: 1,
        }),
      });
    }),
};
