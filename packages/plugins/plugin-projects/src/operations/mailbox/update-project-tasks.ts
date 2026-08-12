//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import type * as Project from '@dxos/compute/Project';
import { Database, Feed, Filter } from '@dxos/echo';
import { log } from '@dxos/log';
import type * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import { Message } from '@dxos/types';

import * as ProjectOperation from '../../types/ProjectOperation';
import { messagesAscending, senderMatches, upsertTask } from './helpers';

/** Task title/description for a tracked request message. */
const taskFromMessage = (message: Message.Message): { title: string; description: string } => {
  const subject = typeof message.properties?.subject === 'string' ? message.properties.subject : '(no subject)';
  const sender = message.sender?.name ?? message.sender?.email ?? 'unknown';
  return {
    title: subject,
    description: `Request from ${sender} (${message.sender?.email ?? '?'}) on ${message.created}.`,
  };
};

/**
 * The shared request-tracking pipeline: every feed message from one of the tracked senders becomes
 * a task in the project's task set, keyed by message id so reruns (and the feed-triggered routine's
 * repeated firings) never duplicate — and never resurrect a task the user completed or edited.
 * Exported for `CreateTrackingProject`'s initial backfill.
 */
export const syncProjectTasks = (project: Project.Project, mailbox: Mailbox.Mailbox, senders: readonly string[]) =>
  Effect.gen(function* () {
    const feed = yield* Database.load(mailbox.feed);
    const messages = yield* Feed.query(feed, Filter.type(Message.Message)).run;
    const matched = messagesAscending(messages).filter((message) => senderMatches(message, senders));

    let created = 0;
    for (const message of matched) {
      const added = yield* upsertTask(project, { id: `task-${message.id}`, ...taskFromMessage(message) });
      if (added) {
        created += 1;
      }
    }

    return { scanned: messages.length, matched: matched.length, created };
  });

const handler = ProjectOperation.UpdateProjectTasks.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ project: projectRef, mailbox: mailboxRef, senders }) {
      const project = yield* Database.load(projectRef);
      const mailbox = yield* Database.load(mailboxRef);
      const { db } = yield* Database.Service;

      const result = yield* syncProjectTasks(project, mailbox, senders);
      yield* Effect.promise(() => db.flush());
      log.info('project-tasks: done', { project: project.name, ...result });
      return result;
    }),
  ),
  Operation.opaqueHandler,
);

export default handler;
