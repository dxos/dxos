//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Skill, Instructions, Trigger } from '@dxos/compute';
import { Database, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Mailbox } from '@dxos/plugin-inbox';
import { makeRoutineDraft } from '@dxos/plugin-routine';
import { Routine, type RoutineCapabilities } from '@dxos/plugin-routine/types';
import { trim } from '@dxos/util';

/**
 * Skill keys composed into the CRM instructions. The CRM skill provides CRM-specific tools; the others
 * supply the database, web-search, and document utilities the agent relies on.
 */
const SKILL_KEYS = [
  'org.dxos.skill.crm',
  'org.dxos.skill.webSearch',
  'org.dxos.skill.database',
  'org.dxos.skill.markdown',
] as const;

/** Default instructions seeded into the instructions; the user edits these by opening the instructions. */
const DEFAULT_INSTRUCTIONS = trim`
  A new email message is provided in the <input> block below.

  - Research the sender and any contacts mentioned in the message.
  - Create and link a summary document for the sender's Organization if one does not already exist.
  - Create or update CRM Profiles (Person and/or Organization objects) for those contacts using the CRM tools.
  - Attach a profile photo or company logo if you can find one.
`;

/** CRM automation template. Only applies to a Mailbox subject — the feed trigger needs `mailbox.feed`. */
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
      const instructionsName = `CRM — ${mailbox.name ?? 'Mailbox'}`;

      const skillRefs = SKILL_KEYS.map((key) => Ref.fromURI(Skill.registryURI(key)));
      const instructions = Instructions.make({
        name: instructionsName,
        text: DEFAULT_INSTRUCTIONS,
        skills: skillRefs,
      });

      // The feed spec requires the live feed object; Database.load is a read-only DB operation.
      const feed = yield* Database.load(mailbox.feed);
      const trigger = Trigger.make({
        enabled: false,
        spec: Trigger.specFeed(feed),
        // The raw trigger event item is passed as the agent's input; the instructions ref is bound by
        // makeRoutineDraft (which also sets the trigger's function to RunInstructions).
        input: { input: '{{event.item}}' },
        concurrency: 1,
      });

      const routine = Routine.make({ name: name ?? instructionsName, triggers: [] });
      return makeRoutineDraft({ routine, instructions, trigger });
    }),
};
