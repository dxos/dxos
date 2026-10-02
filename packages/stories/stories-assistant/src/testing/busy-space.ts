//
// Copyright 2026 DXOS.org
//

import { AiContext } from '@dxos/assistant';
import * as Chat from '@dxos/assistant/Chat';
import { FeedTraceSink } from '@dxos/compute-runtime';
import * as Trace from '@dxos/compute/Trace';
import { type Database, Feed, Obj, Ref } from '@dxos/echo';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { type Client } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { type ContentBlock, Message, Task, TaskSet } from '@dxos/types';

/**
 * The shape of a long-lived Composer space whose chat was measured slow (a 2026-10 profile dump
 * cross-read with a Chrome trace of the same account): what made its database worker the
 * bottleneck, at the sizes it was seen at.
 */
export type BusyScale = {
  /** Entries in the space's indexed trace feed — the largest driver of index passes and query scans. */
  traceMessages: number;
  /** Extra trace feeds of 2–12 entries, from the trace-feed creation race. */
  strayTraceFeeds: number;
  /** Data feeds holding only repeated context bindings, one per companion chat that was never saved. */
  bindingFeeds: number;
  /** Repeated-binding counts for the feeds that kept re-binding; the rest hold one or two entries. */
  hotBindingFeeds: readonly number[];
  tasks: number;
  emptyTaskSets: number;
  documents: number;
  /** Message counts of the space's other chats; the measured chat is fresh. */
  chatHistories: readonly number[];
  /** Other spaces on the profile, each queried by every index pass. */
  extraSpaces: number;
};

export const BUSY_SCALE: BusyScale = {
  traceMessages: 22_600,
  strayTraceFeeds: 15,
  bindingFeeds: 317,
  hotBindingFeeds: [1087, 1073, 980, 860, 720, 610, 480, 390, 300, 221],
  tasks: 334,
  emptyTaskSets: 189,
  documents: 66,
  chatHistories: [446, 309, 176, 134, 115, 93, 75, 70, 69, 68],
  extraSpaces: 7,
};

/** One feed append per block, so the trace feed lands as ~100-entry blocks like the real one. */
const BLOCK_SIZE = 100;

const WORDS = ['query', 'object', 'task', 'feed', 'index', 'result', 'schema', 'space', 'agent', 'binding', 'trace'];

/** Deterministic filler text of roughly `bytes` characters, varied so it is not one repeated string. */
const filler = (bytes: number, seed: number): string => {
  const parts: string[] = [];
  let length = 0;
  for (let index = 0; length < bytes; index++) {
    const word = WORDS[(seed + index * 7) % WORDS.length];
    parts.push(word);
    length += word.length + 1;
  }
  return parts.join(' ');
};

const OPERATIONS = [
  'org.dxos.operation.assistant.createChat',
  'org.dxos.operation.assistant.ensureCompanionChat',
  'org.dxos.operation.assistant.bindChatContext',
  'org.dxos.operation.github.getPullRequestStatus',
  'org.dxos.operation.registry.querySkills',
  'org.dxos.operation.registry.queryDisabledPlugins',
  'org.dxos.operation.tasks.update',
  'org.dxos.operation.space.queryObjects',
];

/**
 * The trace mix the dump showed: 45% operation.start, 42% operation.end, ~11% completeBlock tool
 * results (with a tail of 20–430 KB copies), the rest task status changes.
 */
const traceMessage = (index: number, spaceId: string): Trace.Message => {
  const bucket = index % 100;
  const timestamp = Date.now() - (22_600 - index) * 60_000;
  const key = OPERATIONS[index % OPERATIONS.length];
  const event: Trace.Event =
    bucket < 45
      ? { type: 'operation.start', timestamp, data: { key, name: key.split('.').pop() } }
      : bucket < 87
        ? { type: 'operation.end', timestamp, data: { key, outcome: 'success' } }
        : bucket < 98
          ? {
              type: 'assistant.completeBlock',
              timestamp,
              data: {
                messageId: Obj.ID.random(),
                role: 'tool',
                block: {
                  _tag: 'toolResult',
                  toolCallId: `call-${index}`,
                  name: 'queryObjects',
                  result: filler(index % 565 === 0 ? 20_000 + (index % 41) * 10_000 : 2_600, index),
                  providerExecuted: false,
                },
              },
            }
          : { type: 'task.statusChanged', timestamp, data: { status: 'done' } };
  return Obj.make(Trace.Message, {
    meta: { processName: `process-${index % 107}`, pid: `pid-${index % 165}`, space: spaceId },
    isEphemeral: false,
    events: [event],
  });
};

const appendInBlocks = async (db: Database.Database, feed: Feed.Feed, items: Obj.Unknown[]): Promise<void> => {
  for (let start = 0; start < items.length; start += BLOCK_SIZE) {
    await db.appendToFeed(feed, items.slice(start, start + BLOCK_SIZE));
  }
};

const seedTraceFeed = async (db: Database.Database, spaceId: string, count: number): Promise<void> => {
  const feed = db.add(Feed.make({ kind: FeedTraceSink.TRACE_FEED_KIND, name: 'Execution Trace', namespace: 'trace' }));
  const items: Obj.Unknown[] = [];
  for (let index = 0; index < count; index++) {
    items.push(traceMessage(index, spaceId));
  }
  await appendInBlocks(db, feed, items);
};

const chatMessage = (index: number): Message.Message => {
  const role = index % 3 === 0 ? 'user' : 'assistant';
  const blocks: ContentBlock.Any[] =
    role === 'user'
      ? [{ _tag: 'text', text: filler(200, index) }]
      : [
          { _tag: 'reasoning', reasoningText: filler(300, index) },
          {
            _tag: 'toolCall',
            toolCallId: `call-${index}`,
            name: 'queryObjects',
            input: '{"limit":50}',
            providerExecuted: false,
          },
          {
            _tag: 'toolResult',
            toolCallId: `call-${index}`,
            name: 'queryObjects',
            // Tool results were 79% of the chat bytes, with a tail past 100 KB.
            result: filler(index % 97 === 0 ? 120_000 : 2_000, index),
            providerExecuted: false,
          },
          { _tag: 'text', text: filler(400, index) },
        ];
  return Message.make({ sender: role, blocks });
};

/** The blank counterpart: nothing written, so the two flows differ only in the data. */
export const seedBlankSpace = async (): Promise<void> => {
  globalThis.__dxosPerfSeed = { done: true, elapsedMs: 0, phases: {} };
};

/** Writes the busy shape into `space` and a handful of sibling spaces on the same profile. */
export const seedBusySpace = async ({
  client,
  space,
  scale = BUSY_SCALE,
}: {
  client: Client;
  space: Space;
  scale?: BusyScale;
}): Promise<void> => {
  const db = space.db;
  const started = Date.now();
  // Per-phase wall time, read back by the perf flow so a slow seed says which writes cost it.
  const phases: Record<string, number> = {};
  let phaseStarted = started;
  const endPhase = (name: string) => {
    const now = Date.now();
    phases[name] = now - phaseStarted;
    phaseStarted = now;
    globalThis.__dxosPerfSeed = { done: false, elapsedMs: now - started, phases };
  };

  const taskSets = Array.from({ length: scale.emptyTaskSets }, () => db.add(TaskSet.make({})));
  const tasks = Array.from({ length: scale.tasks }, (_, index) =>
    db.add(
      Task.make({
        title: `Task ${index + 1}`,
        description: filler(1_500, index),
        status: index % 3 === 0 ? 'done' : 'todo',
      }),
    ),
  );
  Obj.update(taskSets[0], (taskSet) => {
    taskSet.tasks = tasks.slice(0, 55).map((task) => Ref.make(task));
  });
  for (let index = 0; index < scale.documents; index++) {
    db.add(Markdown.make({ name: `Notes ${index + 1}`, content: filler(index % 13 === 0 ? 40_000 : 1_300, index) }));
  }
  await db.flush();
  endPhase('objects');

  await seedTraceFeed(db, space.id, scale.traceMessages);
  endPhase('traceFeed');
  for (let index = 0; index < scale.strayTraceFeeds; index++) {
    await seedTraceFeed(db, space.id, 2 + (index % 11));
  }
  endPhase('strayTraceFeeds');

  // The same binding appended again and again: what a companion chat that kept re-binding left.
  for (let index = 0; index < scale.bindingFeeds; index++) {
    const feed = db.add(Feed.make({}));
    const count = scale.hotBindingFeeds[index] ?? 1 + (index % 2);
    const target = Ref.make(tasks[index % tasks.length]);
    const bindings = Array.from({ length: count }, () =>
      Obj.make(AiContext.Binding, {
        skills: { added: [], removed: [] },
        objects: { added: [target], removed: [] },
      }),
    );
    await appendInBlocks(db, feed, bindings);
  }
  endPhase('bindingFeeds');

  for (const [chatIndex, count] of scale.chatHistories.entries()) {
    const feed = db.add(Feed.make({}));
    db.add(Chat.make({ name: `Earlier chat ${chatIndex + 1}`, feed: Ref.make(feed) }));
    await appendInBlocks(
      db,
      feed,
      Array.from({ length: count }, (_, index) => chatMessage(chatIndex * 1_000 + index)),
    );
  }
  endPhase('chatHistories');
  await db.flush({ indexes: true });
  endPhase('indexFlush');

  for (let index = 0; index < scale.extraSpaces; index++) {
    const sibling = await client.spaces.create({ name: `Sibling ${index + 1}` });
    await sibling.waitUntilReady();
    await seedTraceFeed(sibling.db, sibling.id, 300);
    for (let task = 0; task < 30; task++) {
      sibling.db.add(Task.make({ title: `Sibling task ${task + 1}` }));
    }
    await sibling.db.flush({ indexes: true });
  }
  endPhase('extraSpaces');

  globalThis.__dxosPerfSeed = { done: true, elapsedMs: Date.now() - started, phases };
};

declare global {
  /** Seed progress per phase; `done` tells a perf flow the writes are finished and it can reload. */
  // eslint-disable-next-line no-var
  var __dxosPerfSeed: { done: boolean; elapsedMs: number; phases: Record<string, number> } | undefined;
}
