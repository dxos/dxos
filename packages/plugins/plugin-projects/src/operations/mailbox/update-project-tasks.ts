//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import type * as Project from '@dxos/compute/Project';
import { Database, Feed, Filter } from '@dxos/echo';
import { Cursor } from '@dxos/link';
import { log } from '@dxos/log';
import * as FeedCursor from '@dxos/plugin-inbox/FeedCursor';
import type * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import { Message } from '@dxos/types';

import { ProjectMailboxOperation } from '#types';

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

/** Cursor tag for this pipeline, kept per-project rather than per-mailbox (see below). */
const PROJECT_TASKS_CURSOR_KEY_ID = 'projectTasks';

/**
 * The shared request-tracking pipeline: every feed message from one of the tracked senders becomes
 * a task in the project's task set, keyed by message id so reruns never duplicate — and never
 * resurrect a task the user completed or edited. Exported for `CreateTrackingProject`'s backfill.
 *
 * Cursored on the SUBJECT rather than the feed's owner: several projects track the same mailbox with
 * different senders, so a shared watermark would let one project's run skip messages another had not
 * seen. Tasks stay keyed by message id, so the cursor is pure saving — a replayed message is still a
 * no-op, which is what makes advancing it safe.
 */
export const syncProjectTasks = (project: Project.Project, mailbox: Mailbox.Mailbox, senders: readonly string[]) =>
  Effect.gen(function* () {
    const feed = yield* Database.load(mailbox.feed);
    const cursor = yield* FeedCursor.findOrCreateFeedCursor(mailbox, PROJECT_TASKS_CURSOR_KEY_ID, project);
    const cursorKey = Cursor.parseKey(cursor.max);

    const messages = yield* Feed.query(feed, Filter.type(Message.Message)).run;
    // `>=`, not `>`: two messages can share a `created` timestamp, and excluding the boundary would
    // drop the second one permanently once the first advanced the cursor past it. Re-examining the
    // boundary instant each run is bounded (the messages sharing one timestamp) and costs nothing,
    // because `upsertTask` keys on the message id — the same boundary re-fetch the Gmail sync does.
    const pending = messages.filter((message) => {
      const key = Date.parse(message.created);
      return Number.isFinite(key) && key >= cursorKey;
    });
    const matched = messagesAscending(pending).filter((message) => senderMatches(message, senders));

    let created = 0;
    for (const message of matched) {
      const added = yield* upsertTask(project, { id: `task-${message.id}`, ...taskFromMessage(message) });
      if (added) {
        created += 1;
      }
    }

    // Advanced over everything CONSIDERED, not just what matched: a message from an untracked sender
    // is decided, and re-examining it every run is the cost this cursor exists to remove.
    const highest = pending.reduce((max, message) => {
      const key = Date.parse(message.created);
      return Number.isFinite(key) && key > max ? key : max;
    }, cursorKey);
    if (highest > cursorKey) {
      Cursor.advance(cursor, Cursor.formatKey(highest));
    }

    return { scanned: pending.length, matched: matched.length, created };
  });

const handler = ProjectMailboxOperation.UpdateProjectTasks.pipe(
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
