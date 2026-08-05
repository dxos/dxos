//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Instructions, Skill, Trigger } from '@dxos/compute';
import { Database, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Mailbox } from '@dxos/plugin-inbox';
import { scaffoldProject } from '@dxos/plugin-projects/templates';
import { type ProjectCapabilities } from '@dxos/plugin-projects/types';
import { makeRoutine } from '@dxos/plugin-routine';
import { trim } from '@dxos/util';

/** Skills for the project's chats: CRM tools plus the research/database/document utilities. */
const PROJECT_SKILL_KEYS = [
  'org.dxos.skill.crm',
  'org.dxos.skill.webSearch',
  'org.dxos.skill.database',
  'org.dxos.skill.markdown',
] as const;

/** The starter routine additionally files its outputs into the project (`org.dxos.skill.project`). */
const ROUTINE_SKILL_KEYS = [...PROJECT_SKILL_KEYS, 'org.dxos.skill.project'] as const;

const PROJECT_INSTRUCTIONS = trim`
  This project researches the senders of the mailbox bound into its context.
  CRM Profiles (Person and Organization objects) and dossier documents produced here are the
  project's artifacts. When asked about a contact, check the project's artifacts and existing CRM
  profiles before researching from scratch.
`;

/**
 * The per-message research task — the CRM routine template's instructions plus the artifact-filing
 * step a project adds.
 */
const ROUTINE_INSTRUCTIONS = trim`
  A new email message is provided in the <input> block below.

  - Research the sender and any contacts mentioned in the message.
  - Create and link a summary document for the sender's Organization if one does not already exist.
  - Create or update CRM Profiles (Person and/or Organization objects) for those contacts using the CRM tools.
  - Attach a profile photo or company logo if you can find one.
  - File every profile and document you create into the project's artifacts (adding an existing
    artifact again is a no-op, so file updated profiles too).
`;

/**
 * "Sender research" project template: the CRM research automation reframed as a project — the
 * mailbox as standing context, CRM skills for its chats, and the per-message research routine
 * (feed-triggered, disabled until the user enables it) owned by the project, filing profiles and
 * dossiers into the artifacts collection. Only applies to a Mailbox subject — the feed trigger
 * needs `mailbox.feed`. The routine-only variant remains available as the CRM automation template.
 */
export const crmProject: ProjectCapabilities.Template = {
  id: 'org.dxos.project.crmResearch',
  label: 'Sender Research (CRM)',
  icon: 'ph--address-book--regular',
  appliesTo: (subject) => subject != null && Obj.instanceOf(Mailbox.Mailbox, subject),
  scaffold: ({ name, subject }) =>
    Effect.gen(function* () {
      invariant(
        subject != null && Obj.instanceOf(Mailbox.Mailbox, subject),
        'CRM project template requires a Mailbox subject.',
      );
      const mailbox = subject;
      // The feed spec requires the live feed object; Database.load is a read-only DB operation.
      const feed = yield* Database.load(mailbox.feed);

      const project = scaffoldProject({
        name: name ?? `Sender Research — ${mailbox.name ?? 'Mailbox'}`,
        text: PROJECT_INSTRUCTIONS,
        skills: PROJECT_SKILL_KEYS.map((key) => Ref.fromURI(Skill.registryURI(key))),
        objects: [Ref.make(mailbox)],
      });

      const routine = makeRoutine({
        name: 'Sender Research',
        instructions: Instructions.make({
          name: 'Sender Research',
          text: ROUTINE_INSTRUCTIONS,
          skills: ROUTINE_SKILL_KEYS.map((key) => Ref.fromURI(Skill.registryURI(key))),
          objects: [Ref.make(project)],
        }),
        trigger: Trigger.make({
          enabled: false,
          spec: Trigger.specFeed(feed),
          // The raw trigger event item is passed as the agent's input.
          input: { input: '{{event.item}}' },
          concurrency: 1,
        }),
      });
      Obj.setParent(routine, project);
      Obj.update(project, (project) => {
        project.routines = [...project.routines, Ref.make(routine)];
      });

      return project;
    }),
};
