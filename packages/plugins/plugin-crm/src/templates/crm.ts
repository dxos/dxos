//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AgentPrompt } from '@dxos/assistant-toolkit';
import { Blueprint, Operation, Routine, Trigger } from '@dxos/compute';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Automation, type AutomationCapabilities } from '@dxos/plugin-automation';
import { Mailbox } from '@dxos/plugin-inbox';

/**
 * Blueprint keys composed into the CRM routine. The CRM blueprint provides CRM-specific tools; the others
 * supply the database, web-search, and document utilities the agent relies on.
 */
const BLUEPRINT_KEYS = [
  'org.dxos.blueprint.crm',
  'org.dxos.blueprint.webSearch',
  'org.dxos.blueprint.database',
  'org.dxos.blueprint.markdown',
] as const;

/** Default instructions seeded into the routine; the user edits these by opening the routine. */
const DEFAULT_INSTRUCTIONS = `\
A new email message is provided in the <input> block below.

Research the sender and any contacts mentioned in the message.
Create or update CRM Profiles (Person and/or Organization objects) for those contacts using the CRM tools.
Attach a profile photo or company logo when you can find one.
`;

/**
 * CRM automation template: configures a Mailbox so each new message runs the CRM blueprint via a feed
 * trigger. Scaffolds a Routine (CRM + supporting blueprints), a disabled feed Trigger bound to the
 * mailbox's feed, and an Automation wiring them together. Only offered on a Mailbox subject (it needs
 * `mailbox.feed`).
 */
export const crm: AutomationCapabilities.Template = {
  id: 'org.dxos.automation.crm',
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
      const routineName = `CRM — ${mailbox.name ?? 'Mailbox'}`;

      // Registry-bound blueprint refs — pure, no DB fork required.
      const blueprintRefs = BLUEPRINT_KEYS.map((key) => Ref.fromURI(Blueprint.registryURI(key)));
      const routine = yield* Database.add(
        Routine.make({
          name: routineName,
          instructions: DEFAULT_INSTRUCTIONS,
          input: Schema.Struct({ message: Schema.Unknown }),
          output: Schema.Void,
          blueprints: blueprintRefs,
          context: [],
        }),
      );

      // The trigger's `function` must reference an in-space PersistentOperation; reuse the space's
      // AgentPrompt (key: org.dxos.function.prompt) or persist it on first use.
      const existingFns = yield* Database.query(
        Filter.and(Filter.type(Operation.PersistentOperation), Filter.key('org.dxos.function.prompt')),
      ).run;
      const agentPromptFn = existingFns[0] ?? (yield* Database.add(Operation.serialize(AgentPrompt)));

      // Disabled feed trigger; `input: '{{event.item}}'` is substituted to the new Message at invocation time
      // and becomes the AgentPrompt input, which the routine receives in <input>.
      const feed = yield* Database.load(mailbox.feed);
      const trigger = yield* Database.add(
        Obj.make(Trigger.Trigger, {
          enabled: false,
          function: Ref.make(agentPromptFn),
          spec: Trigger.specFeed(feed),
          input: {
            prompt: Ref.make(routine),
            input: '{{event.item}}',
          },
          concurrency: 1,
        }),
      );

      // The automation is added to the space tree by the caller (SpaceOperation.AddObject); the routine and
      // the AgentPrompt op stay independent (the routine is edited separately and may be reused). The trigger
      // is owned by the automation — it is only reachable via it — so it is parented and cascade-deletes with it.
      const automation = Automation.make({
        name: name ?? routineName,
        runnable: Ref.make(agentPromptFn),
        triggers: [Ref.make(trigger)],
      });
      Obj.setParent(trigger, automation);

      return automation;
    }),
};
