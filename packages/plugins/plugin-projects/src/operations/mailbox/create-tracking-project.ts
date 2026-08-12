//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import * as Trigger from '@dxos/compute/Trigger';
import { Database, Obj, Ref } from '@dxos/echo';
import { extractDomain, isFreeMailDomain, normalizeEmail, organizationNameFromDomain } from '@dxos/extractor-lib';
import { log } from '@dxos/log';
import { makeRoutine } from '@dxos/plugin-routine';
import { trim } from '@dxos/util';

import { scaffoldProject } from '../../templates';
import * as ProjectOperation from '../../types/ProjectOperation';
import { syncProjectTasks } from './update-project-tasks';

const INSTRUCTIONS = (label: string, senders: readonly string[]) => trim`
  This project tracks requests from ${label} (${senders.join(', ')}).
  Incoming messages from these senders become tasks in the project's task set (via the tracking
  routine). Use the task set as the source of truth for open requests; summarize or reprioritize on
  demand.
`;

/**
 * Creates a tracking project from one message — the "project from a sender" flow: the sender's
 * corporate domain defines the tracked group (them and their colleagues; a free-mail sender is
 * tracked by exact address), the project scaffold owns instructions + task set, a feed-triggered
 * routine binds `UpdateProjectTasks` (kind: runnable — no model between trigger and pipeline), and
 * an initial backfill fills the task set from the existing feed.
 */
const handler = ProjectOperation.CreateTrackingProject.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ mailbox: mailboxRef, message }) {
      const mailbox = yield* Database.load(mailboxRef);
      const feed = yield* Database.load(mailbox.feed);
      const { db } = yield* Database.Service;

      const email = normalizeEmail(message.sender?.email);
      if (!email) {
        return yield* Effect.dieMessage('Message has no sender email.');
      }
      const domain = extractDomain(email);
      // Corporate domain → track the whole team; free-mail → track the individual only.
      const corporate = !!domain && !isFreeMailDomain(domain);
      const senders = corporate ? [domain] : [email];
      const label = corporate ? organizationNameFromDomain(domain) : (message.sender?.name ?? email);

      const project = db.add(
        scaffoldProject({
          name: `${label} — Requests`,
          text: INSTRUCTIONS(label, senders),
          objects: [Ref.make(mailbox)],
        }),
      );

      // The tracking routine: fires per new feed message, runs the deterministic task pipeline.
      // Disabled until the user enables it (same convention as the template-scaffolded routines).
      const routine = makeRoutine({
        name: `Track ${label}`,
        spec: { kind: 'runnable', runnable: Ref.fromURI(ProjectOperation.UpdateProjectTasks.meta.key) },
        trigger: Trigger.make({
          enabled: false,
          spec: Trigger.specFeed(feed),
          input: { project: Ref.make(project), mailbox: Ref.make(mailbox), senders },
          concurrency: 1,
        }),
      });
      Obj.setParent(routine, project);
      Obj.update(project, (project) => {
        project.routines = [...project.routines, Ref.make(routine)];
      });

      // Initial backfill: the feed's existing history becomes the starting task set.
      const backfill = yield* syncProjectTasks(project, mailbox, senders);
      yield* Effect.promise(() => db.flush());

      log.info('tracking-project: created', { project: project.name, senders, tasks: backfill.created });
      return { projectId: project.id, senders, tasks: backfill.created };
    }),
  ),
  Operation.opaqueHandler,
);

export default handler;
