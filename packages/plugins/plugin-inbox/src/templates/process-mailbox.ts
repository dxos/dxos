//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Trigger from '@dxos/compute/Trigger';
import { Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { makeRoutine } from '@dxos/plugin-routine';
import type * as RoutineCapabilities from '@dxos/plugin-routine/RoutineCapabilities';

import * as InboxOperation from '../types/InboxOperation';
import * as Mailbox from '../types/Mailbox';

/** Default cron for the processing routine (hourly); the user edits the schedule on the trigger. */
const DEFAULT_CRON = '0 * * * *';

/**
 * "Process Mailbox" automation template: a routine binding `ProcessMailbox` directly
 * (kind: runnable) on a timer trigger, so the loop is deterministic — no model between trigger and
 * operation. The operation's durable feed cursor makes firings idempotent: each run catches up on
 * everything new and extra firings process nothing. Only applies to a Mailbox subject. Manual runs
 * work from the Automations companion and the mailbox toolbar (which schedules the same operation).
 */
export const processMailbox: RoutineCapabilities.Template = {
  id: 'org.dxos.routine.processMailbox',
  label: 'Process Mailbox',
  icon: 'ph--play--regular',
  appliesTo: (subject) => subject != null && Obj.instanceOf(Mailbox.Mailbox, subject),
  scaffold: ({ name, subject }) =>
    Effect.gen(function* () {
      invariant(
        subject != null && Obj.instanceOf(Mailbox.Mailbox, subject),
        'Process Mailbox template requires a Mailbox subject.',
      );
      const mailbox = subject;

      return makeRoutine({
        name: name ?? `Process — ${mailbox.name ?? 'Mailbox'}`,
        spec: { kind: 'runnable', runnable: Ref.fromURI(InboxOperation.ProcessMailbox.meta.key) },
        trigger: Trigger.make({
          enabled: false,
          spec: Trigger.specTimer(DEFAULT_CRON),
          input: { mailbox: Ref.make(mailbox) },
          concurrency: 1,
        }),
      });
    }),
};
