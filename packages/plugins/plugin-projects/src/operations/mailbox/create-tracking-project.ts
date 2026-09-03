//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import * as Project from '@dxos/compute/Project';
import * as Trigger from '@dxos/compute/Trigger';
import { Database, type DXN, Ref } from '@dxos/echo';
import { extractDomain, isFreeMailDomain, normalizeEmail, organizationNameFromDomain } from '@dxos/extractor-lib';
import { log } from '@dxos/log';
import * as InboxOperation from '@dxos/plugin-inbox/InboxOperation';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import { makeRoutine } from '@dxos/plugin-routine';
import { trim } from '@dxos/util';

import { ProjectMailboxOperation } from '#types';

import { scaffoldProject } from '../../templates/index.ts';
import { syncProjectTasks } from './update-project-tasks.ts';

const INSTRUCTIONS = (label: string, senders: readonly string[]) => trim`
  This project tracks requests from ${label} (${senders.join(', ')}).
  Incoming messages from these senders become tasks in the project's task set (via the tracking
  routine). Use the task set as the source of truth for open requests; summarize or reprioritize on
  demand.
`;

/**
 * The pipelines a tracking project can bind, each mapping to a mailbox-global operation plus the
 * inputs that scope it to this project. Adding a pipeline here is what makes it offerable in the
 * product without teaching the operation anything about projects.
 */
const PIPELINES: Record<
  ProjectMailboxOperation.TrackingPipeline,
  (context: { mailbox: Mailbox.Mailbox; senders: readonly string[] }) => {
    runnable: DXN.DXN;
    input: Record<string, unknown>;
    suffix: string;
    routineLabel: string;
  }
> = {
  tasks: ({ mailbox, senders }) => ({
    runnable: ProjectMailboxOperation.UpdateProjectTasks.meta.key,
    input: { mailbox: Ref.make(mailbox), senders },
    suffix: 'Requests',
    routineLabel: 'Track',
  }),
  summaries: ({ mailbox, senders }) => ({
    runnable: ProjectMailboxOperation.UpdateInvestorLog.meta.key,
    input: { mailbox: Ref.make(mailbox), domains: senders },
    suffix: 'Conversations',
    routineLabel: 'Summarize',
  }),
  contacts: ({ mailbox }) => ({
    runnable: InboxOperation.ExtractCorrespondents.meta.key,
    // Correspondence is derived against the mailbox owner, not the tracked senders.
    input: { mailbox: Ref.make(mailbox), me: Mailbox.identityAddresses(mailbox) },
    suffix: 'Contacts',
    routineLabel: 'Extract contacts for',
  }),
};

/**
 * Creates a tracking project from one message — the "project from a sender" flow: the sender's
 * corporate domain defines the tracked group (them and their colleagues; a free-mail sender is
 * tracked by exact address), the project scaffold owns instructions + task set, a feed-triggered
 * routine binds `UpdateProjectTasks` (kind: runnable — no model between trigger and pipeline), and
 * an initial backfill fills the task set from the existing feed.
 */
const handler = ProjectMailboxOperation.CreateTrackingProject.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ mailbox: mailboxRef, message, scope, pipeline = 'tasks', name }) {
      const mailbox = yield* Database.load(mailboxRef);
      const feed = yield* Database.load(mailbox.feed);
      const { db } = yield* Database.Service;

      const email = normalizeEmail(message.sender?.email);
      if (!email) {
        return yield* Effect.die(new Error('Message has no sender email.'));
      }
      // The domain the project follows, or undefined to track the individual. A free-mail domain
      // identifies no organization, so it can never widen the scope to a "team" — it degrades to the
      // sender rather than following every gmail.com address.
      const domain = extractDomain(email);
      const group =
        (scope ?? 'domain') === 'domain' && domain !== undefined && !isFreeMailDomain(domain) ? domain : undefined;
      const senders = group ? [group] : [email];
      const label = group ? organizationNameFromDomain(group) : (message.sender?.name ?? email);

      const { runnable, input, suffix, routineLabel } = PIPELINES[pipeline]({ mailbox, senders });
      const project = db.add(
        scaffoldProject({
          name: name ?? `${label} — ${suffix}`,
          text: INSTRUCTIONS(label, senders),
          objects: [Ref.make(mailbox)],
        }),
      );

      // The routine: fires per new feed message and runs the chosen pipeline as a runnable — no
      // model sits between the trigger and the operation. Disabled until the user enables it (the
      // convention every template-scaffolded routine follows).
      const routine = makeRoutine({
        name: `${routineLabel} ${label}`,
        spec: { kind: 'runnable', runnable: Ref.fromURI(runnable) },
        trigger: Trigger.make({
          enabled: false,
          spec: Trigger.specFeed(feed),
          input: { project: Ref.make(project), ...input },
          concurrency: 1,
        }),
      });
      Project.addRoutine(project, routine);

      // Initial backfill, for the pipeline that has one: the feed's existing history becomes the
      // starting task set, so the project is useful before its first trigger fires.
      const backfill = pipeline === 'tasks' ? yield* syncProjectTasks(project, mailbox, senders) : { created: 0 };
      yield* Effect.promise(() => db.flush());

      log.info('tracking-project: created', { project: project.name, senders, pipeline, tasks: backfill.created });
      return { projectId: project.id, senders, pipeline, tasks: backfill.created };
    }),
  ),
  Operation.opaqueHandler,
);

export default handler;
