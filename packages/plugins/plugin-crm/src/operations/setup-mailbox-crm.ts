//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AgentPrompt } from '@dxos/assistant-toolkit';
import { Blueprint, Operation, Routine, Trigger } from '@dxos/compute';
import { Database, Filter, Obj, Ref, URI } from '@dxos/echo';
import { log } from '@dxos/log';
import { Mailbox } from '@dxos/plugin-inbox';

import { CrmOperation } from '../types';

/**
 * Blueprint keys composed into the CRM routine.
 * The CRM blueprint provides CRM-specific tools; the others supply the
 * database, web-search, and document utilities the agent relies on.
 */
const BLUEPRINT_KEYS = [
  'org.dxos.blueprint.crm',
  'org.dxos.blueprint.webSearch',
  'org.dxos.blueprint.database',
  'org.dxos.blueprint.markdown',
] as const;

/**
 * Short default instructions seeded into the routine.
 * The user can edit these from the companion panel.
 */
const DEFAULT_INSTRUCTIONS = `\
A new email message is provided in the <input> block below.

Research the sender and any contacts mentioned in the message.
Create or update CRM Profiles (Person and/or Organization objects) for those contacts using the CRM tools.
Attach a profile photo or company logo when you can find one.
`;

const handler: Operation.WithHandler<typeof CrmOperation.SetupMailboxCrm> = CrmOperation.SetupMailboxCrm.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ mailboxUri }) {
      // 1. Resolve and validate the mailbox by its URI.
      const mailbox = yield* Database.resolve(URI.make(mailboxUri), Mailbox.Mailbox);

      // 2. Build registry-bound blueprint refs — pure, no DB fork required.
      const blueprintRefs = BLUEPRINT_KEYS.map((key) => Ref.fromURI(Blueprint.registryURI(key)));

      // 3. Create the Routine with seeded instructions and the CRM + related blueprints.
      const routine = yield* Database.add(
        Routine.make({
          name: `CRM — ${mailbox.name ?? 'Mailbox'}`,
          instructions: DEFAULT_INSTRUCTIONS,
          input: Schema.Struct({ message: Schema.Unknown }),
          output: Schema.Void,
          blueprints: blueprintRefs,
          context: [],
        }),
      );

      // 4. Ensure the AgentPrompt operation (key: org.dxos.function.prompt) is persisted.
      //    The trigger's `function` field must reference an in-space PersistentOperation.
      const existingFns = yield* Database.query(
        Filter.and(Filter.type(Operation.PersistentOperation), Filter.key('org.dxos.function.prompt')),
      ).run;
      const agentPromptFn = existingFns[0] ?? (yield* Database.add(Operation.serialize(AgentPrompt)));

      // 5. Load the mailbox's backing feed and create a feed trigger.
      //    The trigger starts disabled so the user can review and edit instructions first.
      //    `input: '{{event.item}}'` is substituted to the new Message at invocation time
      //    and becomes the AgentPrompt.input, which the routine receives in <input>.
      //    The feed cursor starts unset intentionally — on first enable the dispatcher
      //    will backfill existing messages to seed the CRM from historical mail.
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

      log.info('setup-mailbox-crm', {
        mailboxId: Obj.getURI(mailbox),
        routineId: routine.id,
        triggerId: trigger.id,
      });
    }),
  ),
);

export default handler;
