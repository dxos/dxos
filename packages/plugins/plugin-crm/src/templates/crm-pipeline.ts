//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Skill, Trigger } from '@dxos/compute';
import { Database, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Mailbox } from '@dxos/plugin-inbox';
import { scaffoldProject } from '@dxos/plugin-projects/templates';
import { type ProjectCapabilities } from '@dxos/plugin-projects/types';
import { makeRoutine } from '@dxos/plugin-routine';
import { trim } from '@dxos/util';

import { CrmOperation } from '../types';

/** Skills for the project's chats: CRM tools plus the research/database/document utilities. */
const PROJECT_SKILL_KEYS = [
  'org.dxos.skill.crm',
  'org.dxos.skill.webSearch',
  'org.dxos.skill.database',
  'org.dxos.skill.markdown',
] as const;

const PROJECT_INSTRUCTIONS = trim`
  This project processes the mailbox bound into its context for CRM: new senders become Person
  records linked to known Organizations, each with a scaffolded Profile document. When asked about
  a contact, check the existing CRM records and Profile documents before researching from scratch,
  and enrich Profile documents in place.
`;

/**
 * "CRM pipeline" project template: the deterministic counterpart of the agentic Sender Research
 * template. The routine binds `ProcessMailbox` directly (kind: runnable) on a feed trigger, so the
 * trigger loop is deterministic — no model between trigger and operation. The operation's durable
 * feed cursor plus the identity index make per-item firing idempotent: each firing catches up on
 * everything new and extra firings process nothing. Only applies to a Mailbox subject — the feed
 * trigger needs `mailbox.feed`.
 */
export const crmPipeline: ProjectCapabilities.Template = {
  id: 'org.dxos.project.crmPipeline',
  label: 'CRM Pipeline',
  icon: 'ph--address-book--regular',
  appliesTo: (subject) => subject != null && Obj.instanceOf(Mailbox.Mailbox, subject),
  scaffold: ({ name, subject }) =>
    Effect.gen(function* () {
      invariant(
        subject != null && Obj.instanceOf(Mailbox.Mailbox, subject),
        'CRM pipeline template requires a Mailbox subject.',
      );
      const mailbox = subject;
      // The feed spec requires the live feed object; Database.load is a read-only DB operation.
      const feed = yield* Database.load(mailbox.feed);

      const project = scaffoldProject({
        name: name ?? `CRM Pipeline — ${mailbox.name ?? 'Mailbox'}`,
        text: PROJECT_INSTRUCTIONS,
        skills: PROJECT_SKILL_KEYS.map((key) => Ref.fromURI(Skill.registryURI(key))),
        objects: [Ref.make(mailbox)],
      });

      const routine = makeRoutine({
        name: 'Process Mailbox',
        spec: { kind: 'runnable', runnable: Ref.fromURI(CrmOperation.ProcessMailbox.meta.key) },
        trigger: Trigger.make({
          enabled: false,
          spec: Trigger.specFeed(feed),
          input: { mailbox: Ref.make(mailbox), research: true },
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
