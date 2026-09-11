//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import * as Skill from '@dxos/compute/Skill';
import * as Trigger from '@dxos/compute/Trigger';
import { Database, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import { makeRoutine } from '@dxos/plugin-routine';
import { trim } from '@dxos/util';

import { ProjectCapabilities } from '#types';

import { scaffoldProject } from './scaffold.ts';

/**
 * Skill keys composed into the project's instructions (chat sessions) and the starter routine.
 * Plain dotted keys (not skill imports) so plugin-inbox does not depend on the plugins that own
 * them — the `SkillsAnnotation` idiom.
 */
const PROJECT_SKILL_KEYS = ['org.dxos.skill.inbox', 'org.dxos.skill.table'] as const;
const ROUTINE_SKILL_KEYS = ['org.dxos.skill.table', 'org.dxos.skill.project'] as const;

/** Steers every chat opened in the project's context; the user edits it in the project article. */
const PROJECT_INSTRUCTIONS = trim`
  This project researches the mailbox bound into its context.
  Use the inbox tools to read messages, and keep durable outputs (tables, documents, profiles) in
  the project's artifacts. When asked about senders, prefer the project's Sender Ledger table over
  re-reading the whole mailbox.
`;

/** The starter routine's headless task: maintain the sender-ledger table, one row per sender. */
const ROUTINE_INSTRUCTIONS = trim`
  A new email message from the project's mailbox is provided in the <input> block below.

  Maintain the project's "Sender Ledger" table artifact: one row per sender, with columns
  email, name, count, and lastSeen.
  - List the project's artifacts to find the Sender Ledger table. If it does not exist, create it
    and file it into the project's artifacts.
  - Upsert the sender's row: create it if missing, otherwise increment count and update lastSeen
    from the message date. Never create a second row for an email address that already has one.
`;

/**
 * "Inbox research" project template: the mailbox as standing context, inbox + table skills for its
 * chats, and a starter sender-ledger routine (feed-triggered, disabled until the user enables it)
 * owned by the project. Only applies to a Mailbox subject — the routine's trigger needs
 * `mailbox.feed`.
 */
export const inboxResearch: ProjectCapabilities.Template = {
  id: 'org.dxos.project.inboxResearch',
  label: 'Inbox Research',
  icon: 'ph--tray--regular',
  appliesTo: (subject) => subject != null && Mailbox.instanceOf(subject),
  scaffold: ({ name, subject }) =>
    Effect.gen(function* () {
      invariant(subject != null && Mailbox.instanceOf(subject), 'Inbox research template requires a Mailbox subject.');
      const mailbox = subject;
      // The feed spec requires the live feed object; Database.load is a read-only DB operation.
      const feed = yield* Database.load(mailbox.feed);

      const project = scaffoldProject({
        name: name ?? `Inbox Research — ${mailbox.name ?? 'Mailbox'}`,
        text: PROJECT_INSTRUCTIONS,
        skills: PROJECT_SKILL_KEYS.map((key) => Ref.fromURI(Skill.registryURI(key))),
        objects: [Ref.make(mailbox)],
      });

      // The routine runs headless (`RunInstructions`), so everything it needs is on its own
      // instructions: the project ref as context (to file the table into the artifacts) and the
      // table + project skills. The message itself arrives as the trigger input.
      const routine = makeRoutine({
        name: 'Sender Ledger',
        instructions: Instructions.make({
          name: 'Sender Ledger',
          text: ROUTINE_INSTRUCTIONS,
          skills: ROUTINE_SKILL_KEYS.map((key) => Ref.fromURI(Skill.registryURI(key))),
          objects: [Ref.make(project)],
        }),
        trigger: Trigger.make({
          enabled: false,
          spec: Trigger.specFeed(feed),
          // The raw trigger event item (the new message) is passed as the agent's input.
          input: { input: '{{event.item}}' },
          concurrency: 1,
        }),
      });
      Project.addRoutine(project, routine);

      return project;
    }),
};
