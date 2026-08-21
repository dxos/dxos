//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Trigger from '@dxos/compute/Trigger';
import { Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { makeRoutine } from '@dxos/plugin-routine';
import type * as RoutineCapabilities from '@dxos/plugin-routine/RoutineCapabilities';
import { AI_ACTION_ICON } from '@dxos/ui-types';

import * as InboxOperation from '../types/InboxOperation';
import * as Mailbox from '../types/Mailbox';

/** Default cron for the cascade (daily, early); the user edits the schedule on the trigger. */
const DEFAULT_CRON = '0 6 * * *';

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
  appliesTo: (subject) => subject != null && Obj.instanceOf(Mailbox.Mailbox, subject),
  scaffold: ({ name, subject }) =>
    Effect.gen(function* () {
      invariant(
        subject != null && Obj.instanceOf(Mailbox.Mailbox, subject),
        'Analyze Mailbox template requires a Mailbox subject.',
      );
      const mailbox = subject;

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
