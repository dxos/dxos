//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Skill from '@dxos/compute/Skill';
import * as Trigger from '@dxos/compute/Trigger';
import { Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import * as InboxOperation from '@dxos/plugin-inbox/InboxOperation';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import type * as ProjectCapabilities from '@dxos/plugin-projects/ProjectCapabilities';
import { scaffoldProject } from '@dxos/plugin-projects/templates';
import { makeRoutine } from '@dxos/plugin-routine';
import { trim } from '@dxos/util';

/** Chats get the brain (fact query/summarize) and inbox (read mail) skills. */
const PROJECT_SKILL_KEYS = ['org.dxos.skill.brain', 'org.dxos.skill.inbox'] as const;

/** Default cron for the analysis routine: daily at 7 AM. The user edits the schedule on the trigger. */
const DEFAULT_CRON = '0 7 * * *';

const PROJECT_INSTRUCTIONS = trim`
  This project maintains a fact base extracted from the mailbox bound into its context, and answers
  questions from it.
  When asked to summarize a sender, thread, or topic — or "where things stand" with someone — use
  the fact tools (Summarize Subject / Query Facts) FIRST rather than re-reading the mailbox, and
  cite the source messages the facts came from. Fall back to reading mail only for detail the facts
  do not carry.
`;

/**
 * "Mailbox facts" project template: the mailbox as standing context, brain + inbox skills for its
 * chats, and a starter routine that runs `InboxOperation.AnalyzeMailbox` on a schedule.
 *
 * The routine binds the operation directly rather than an instructions prompt, so the trigger loop
 * is deterministic — the extraction model runs inside the operation, not around it. Extracted facts
 * land in the space fact store keyed by provenance, so they are queryable by any session but are
 * not artifacts the project owns. Only applies to a Mailbox subject.
 */
export const mailboxFacts: ProjectCapabilities.Template = {
  id: 'org.dxos.project.mailboxFacts',
  label: 'Mailbox Facts',
  icon: 'ph--brain--regular',
  appliesTo: (subject) => subject != null && Obj.instanceOf(Mailbox.Mailbox, subject),
  scaffold: ({ name, subject }) =>
    Effect.gen(function* () {
      invariant(
        subject != null && Obj.instanceOf(Mailbox.Mailbox, subject),
        'Mailbox facts template requires a Mailbox subject.',
      );
      const mailbox = subject;

      const project = scaffoldProject({
        name: name ?? `Mailbox Facts — ${mailbox.name ?? 'Mailbox'}`,
        text: PROJECT_INSTRUCTIONS,
        skills: PROJECT_SKILL_KEYS.map((key) => Ref.fromURI(Skill.registryURI(key))),
        objects: [Ref.make(mailbox)],
      });

      // Deterministic operation action: the trigger fires AnalyzeMailbox directly with the mailbox
      // ref baked in at scaffold time; the persisted cursor makes re-runs incremental.
      const routine = makeRoutine({
        name: 'Analyze Mailbox',
        spec: { kind: 'runnable', runnable: Ref.fromURI(InboxOperation.AnalyzeMailbox.meta.key) },
        trigger: Trigger.make({
          enabled: false,
          spec: Trigger.specTimer(DEFAULT_CRON),
          input: { mailbox: Ref.make(mailbox) },
        }),
      });
      Obj.setParent(routine, project);
      Obj.update(project, (project) => {
        project.routines = [...project.routines, Ref.make(routine)];
      });

      return project;
    }),
};
