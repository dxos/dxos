//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from 'effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';

import { AiService } from '@dxos/ai';
import * as Operation from '@dxos/compute/Operation';
import type * as Project from '@dxos/compute/Project';
import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { Cursor } from '@dxos/link';
import { log } from '@dxos/log';
import { Message } from '@dxos/types';
import { trim } from '@dxos/util';

import { ProjectMailboxOperation } from '#types';

import { PROJECT_PIPELINE_KEY_SOURCE, messagesAscending, upsertTask } from '../mailbox/helpers.ts';

const DEFAULT_MODEL = 'com.anthropic.model.claude-haiku-4-5.default';

const KIND_LABEL: Record<ProjectMailboxOperation.TriageResult['tasks'][number]['kind'], string> = {
  bug: 'Bug',
  feature: 'Feature',
  docs: 'Docs',
  action: 'Follow up',
};

/** The prompt names the author and quotes the message, so a scripted model can route on the text. */
export const triagePrompt = ({ project, author, text }: { project: string; author: string; text: string }) => trim`
  You triage messages posted in a community chat channel for the team behind "${project}".
  For the message below, decide two things.
  - reply: when the message asks the team a question or for help, draft a short, friendly reply.
    Do not invent facts, links, dates or commitments; when the answer is not known, say the team will follow up.
    Omit it for greetings, announcements and chatter.
  - tasks: work the message asks for or reveals: a bug to fix, a feature to build, docs to write, or an action to
    follow up. Give each an imperative title. Leave the list empty for chatter.

  Author: ${author}
  Message:
  ${text}
`;

const quote = (text: string) =>
  text
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');

/** The message's first question, else its opening, so a reply task names what it answers. */
const headline = (text: string) => {
  const flat = text.replace(/\s+/g, ' ').trim();
  const line = flat.match(/[^.!?]*\?/)?.[0].trim() || flat;
  return line.length > 60 ? `${line.slice(0, 57)}…` : line;
};

/** One cursor per feed and project: two projects triaging the same channel must not skip each other's messages. */
const findOrCreateCursor = (project: Project.Project, feed: Feed.Feed) =>
  Effect.gen(function* () {
    const { db } = yield* Database.Service;
    const key = { source: PROJECT_PIPELINE_KEY_SOURCE, id: `triage:${feed.id}:${project.id}` };
    const [existing] = yield* Effect.promise(() => db.query(Filter.foreignKeys(Cursor.Cursor, [key])).run());
    if (existing) {
      return existing;
    }
    return db.add(
      Cursor.make({
        spec: { kind: 'feed', source: Ref.make(feed), target: Ref.make(project) },
        [Obj.Meta]: { keys: [key] },
      }),
    );
  });

/**
 * Triages the feed's messages from the cursor on: one model call per message, then a "Reply to" task
 * carrying the drafted reply and one task per work item, each keyed by the message so reruns are no-ops.
 * A failed call stops the run before that message, so it is triaged again next run rather than skipped.
 */
export const triageMessages = ({
  project,
  feed,
  model = DEFAULT_MODEL,
}: {
  project: Project.Project;
  feed: Feed.Feed;
  model?: string;
}) =>
  Effect.gen(function* () {
    const cursor = yield* findOrCreateCursor(project, feed);
    const cursorKey = Cursor.parseKey(cursor.max);
    const messages = yield* Feed.query(feed, Filter.type(Message.Message)).run;
    // `>=`, as in `syncProjectTasks`: two messages can share a timestamp, and the task keys make the
    // re-examined boundary message a no-op.
    const pending = messagesAscending(messages).filter((message) => Date.parse(message.created) >= cursorKey);

    let replies = 0;
    let tasks = 0;
    let highest = cursorKey;
    for (const message of pending) {
      const text = Message.extractText(message).trim();
      // Bots and the agent itself post here too; their messages are not requests to the team.
      if (text.length > 0 && message.sender.role !== 'assistant') {
        const author = message.sender.name ?? message.sender.email ?? 'someone';
        const result = yield* LanguageModel.generateObject({
          schema: ProjectMailboxOperation.TriageResult,
          prompt: triagePrompt({ project: project.name ?? 'the project', author, text }),
        }).pipe(
          Effect.provide(AiService.languageModel(model)),
          Effect.map(({ value }) => value),
          Effect.tapError((error) => Effect.sync(() => log.warn('triage failed', { messageId: message.id, error }))),
          Effect.option,
        );
        if (result._tag === 'None') {
          break;
        }

        const { reply, tasks: work } = result.value;
        if (reply && reply.trim().length > 0) {
          const added = yield* upsertTask(project, {
            id: `triage-${message.id}-reply`,
            title: `Reply to ${author}: ${headline(text)}`,
            description: `**Draft reply**\n\n${reply.trim()}\n\n${quote(text)}`,
          });
          replies += added ? 1 : 0;
        }
        for (const [index, item] of work.entries()) {
          const added = yield* upsertTask(project, {
            id: `triage-${message.id}-${index}`,
            title: `${KIND_LABEL[item.kind]}: ${item.title}`,
            description: [item.description, `From ${author}:\n\n${quote(text)}`].filter(Boolean).join('\n\n'),
          });
          tasks += added ? 1 : 0;
        }
      }

      highest = Math.max(highest, Date.parse(message.created));
    }

    if (highest > cursorKey) {
      Cursor.advance(cursor, Cursor.formatKey(highest));
    }
    return { scanned: pending.length, replies, tasks };
  });

const handler: Operation.WithHandler<typeof ProjectMailboxOperation.TriageMessages> =
  ProjectMailboxOperation.TriageMessages.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ project: projectRef, feed: feedRef, model }) {
        const project = yield* Database.load(projectRef);
        const feed = yield* Database.load(feedRef);
        return yield* triageMessages({ project, feed, model });
      }),
    ),
  );

export default handler;
