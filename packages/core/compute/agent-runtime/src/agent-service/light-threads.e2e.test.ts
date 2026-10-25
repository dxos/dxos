//
// Copyright 2026 DXOS.org
//

import { afterAll, describe, it } from '@effect/vitest';
import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from 'vitest';

import { Model } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { Alarm, SessionStore, TrajectoryStore } from '@dxos/assistant';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Skill from '@dxos/compute/Skill';
import { type Feed } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { DXN } from '@dxos/keys';
import { Reducer, type Trajectory } from '@dxos/trajectory';
import { type ContentBlock, Message } from '@dxos/types';

import { AssistantTestLayer } from '../testing/index.ts';
import * as AgentService from './AgentService.ts';

/**
 * Light threads against a real model (Claude Haiku through the hosted EDGE AI proxy). Manual: run with
 * `DX_RUN_MANUAL_TESTS=1 moon run agent-runtime:test -- src/agent-service/light-threads.e2e.test.ts`. Assertions are
 * structural; what the model did is written to `docs/light-threads-e2e.md` for a person to read.
 */

const REPORT = join(dirname(fileURLToPath(import.meta.url)), '../../docs/light-threads-e2e.md');

/** How long the slow lookup takes, so the prompts sent after it overlap the turn that called it. */
const LOOKUP_MS = 15_000;

let lookupStarted: Deferred.Deferred<void> | undefined;

const SlowLookup = Operation.make({
  meta: {
    key: DXN.make('com.example.operation.slowLookup'),
    name: 'Slow lookup',
    description: 'Looks up reference material on a topic. Slow: takes about 15 seconds.',
  },
  input: Schema.Struct({ topic: Schema.String.annotate({ description: 'Topic to look up.' }) }),
  output: Schema.String,
});

const handlers = OperationHandlerSet.make(
  SlowLookup.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ topic }) {
        if (lookupStarted) {
          yield* Deferred.succeed(lookupStarted, undefined);
        }
        yield* Effect.sleep(LOOKUP_MS);
        return `Notes on ${topic}: tides, salt, deep blue water, gulls, endless horizon.`;
      }),
    ),
  ),
);

const LookupSkill = Skill.make({
  key: 'org.dxos.skill.slowLookup',
  name: 'Lookup',
  tools: Skill.toolDefinitions({ operations: [SlowLookup] }),
});

const layer = () =>
  AssistantTestLayer({
    types: [Alarm.Alarm],
    operationHandlers: [handlers],
    skills: [LookupSkill],
    model: Model.claudeHaiku45.id,
    // The hosted EDGE AI proxy, which needs no local provider key.
    aiService: AiServiceTestingPreset('edge-remote').pipe(Layer.orDie),
    agent: { threading: () => ({ limit: 3 }) },
  });

//
// Report.
//

const sections: string[] = [];

const renderBlock = (block: ContentBlock.Any): string | undefined => {
  switch (block._tag) {
    case 'text':
      return block.text.trim().length > 0 ? block.text.trim().replaceAll('\n', ' ⏎ ') : undefined;
    case 'toolCall':
      return `→ ${block.name}(${block.input})`;
    case 'toolResult':
      return `← ${block.name}: ${String(typeof block.result === 'string' ? block.result : JSON.stringify(block.result)).slice(0, 200)}`;
    default:
      return undefined;
  }
};

const renderItem = (item: { sender: Trajectory.Sender; blocks: readonly ContentBlock.Any[] }) => {
  const text = item.blocks.flatMap((block) => renderBlock(block) ?? []).join(' / ');
  return text.length > 0 ? `- **${item.sender.name ?? item.sender.role}**: ${text}` : undefined;
};

/** Seconds from `start` to an ISO timestamp. */
const at = (start: number, iso: string | undefined) =>
  iso === undefined ? '—' : `${((Date.parse(iso) - start) / 1000).toFixed(1)}s`;

const report = (feed: Feed.Feed, title: string, prompts: readonly string[], start: number) =>
  Effect.gen(function* () {
    const { state: view } = yield* TrajectoryStore.load(feed, Reducer.thread);
    const events = yield* TrajectoryStore.read(feed);
    const endOf = (lane: Reducer.Lane) =>
      events.find(
        (event) =>
          (event.payload._tag === 'threadMerge' && event.payload.thread === lane.id) ||
          (event.payload._tag === 'turnEnd' && event.payload.begin === lane.id),
      )?.created;
    const waits = events.filter((event) => event.payload._tag === 'threadWait');
    const history = yield* TrajectoryStore.history(feed);
    const lines = [
      `## ${title}`,
      '',
      'Prompts, in the order sent:',
      '',
      ...prompts.map((prompt, index) => `${index + 1}. ${prompt}`),
      '',
      `Lanes: ${view.lanes.length}, light threads: ${view.lanes.filter((lane) => lane.kind === 'light').length}, ` +
        `\`threadWait\` events: ${waits.length}.`,
      '',
      ...view.lanes.flatMap((lane, index) => [
        `### Lane ${index + 1}: ${lane.kind}${lane.purpose ? ` — "${lane.purpose}"` : ''}`,
        '',
        `id \`${lane.id}\`, status **${lane.status}**, opened ${at(start, lane.created)}, ended ${at(start, endOf(lane))}` +
          (lane.overlapped ? ', overlapped' : '') +
          (waits.some((wait) => view.laneOf[wait.thread ?? ''] === lane.id)
            ? `, waited on ${waits
                .filter((wait) => view.laneOf[wait.thread ?? ''] === lane.id)
                .map((wait) => (wait.payload._tag === 'threadWait' ? `\`${wait.payload.on}\`` : ''))
                .join(', ')}`
            : ''),
        '',
        ...view.items.filter((item) => item.lane === lane.id).flatMap((item) => renderItem(item) ?? []),
        '',
      ]),
      '### Main thread after every merge',
      '',
      ...history.flatMap(
        (message) =>
          renderItem({
            sender: { role: message.sender.role ?? 'assistant' },
            blocks: message.blocks,
          }) ?? [],
      ),
      '',
    ];
    sections.push(lines.join('\n'));
    return view;
  });

/** Hand-written findings after this marker survive a rerun; the transcripts above it are regenerated. */
const FINDINGS = '<!-- findings -->';

afterAll(() => {
  if (sections.length === 0) {
    return;
  }
  mkdirSync(dirname(REPORT), { recursive: true });
  const previous = existsSync(REPORT) ? readFileSync(REPORT, 'utf8') : '';
  const findings = previous.includes(FINDINGS) ? previous.slice(previous.indexOf(FINDINGS)) : FINDINGS;
  writeFileSync(
    REPORT,
    [
      '# Light threads against a real model',
      '',
      `Generated by \`src/agent-service/light-threads.e2e.test.ts\` (Claude Haiku 4.5, limit 3) on ${new Date().toISOString()}.`,
      '',
      ...sections,
      findings,
    ].join('\n'),
  );
});

//
// Helpers.
//

const textOf = (message: Message.Message) => Message.extractText(message).trim();

/** Every prompt was consumed and the process left nothing queued; every lane ended. */
const expectSettled = (feed: Feed.Feed, view: Reducer.ThreadView) =>
  Effect.gen(function* () {
    const pending = yield* new SessionStore().loadPending(feed);
    expect(pending.pendingMessages).toEqual([]);
    expect(view.lanes.every((lane) => lane.status === 'done')).toBe(true);
    expect(view.items.filter((item) => item.sender.role === 'user').every((item) => item.status === 'consumed')).toBe(
      true,
    );
    const { state: prompt } = yield* TrajectoryStore.load(feed, Reducer.prompt);
    expect(Object.keys(prompt.threads)).toEqual([]);
  });

/** The last assistant text in a lane. */
const answerOf = (view: Reducer.ThreadView, lane: Reducer.Lane) =>
  view.items
    .filter((item) => item.lane === lane.id && item.sender.role === 'assistant')
    .flatMap((item) => item.blocks.flatMap((block) => (block._tag === 'text' ? [block.text] : [])))
    .join('\n');

const TIMEOUT = 240_000;

describe('light threads (real model)', { tags: ['manual'] }, () => {
  it.live(
    'parallel: four independent prompts while a slow turn runs',
    Effect.fnUntraced(
      function* (_) {
        const start = Date.now();
        lookupStarted = yield* Deferred.make<void>();
        const session = yield* AgentService.createSession({ skills: [LookupSkill] });
        const prompts = [
          'Use the slow lookup tool on "the sea", then write two sentences about the sea from the notes.',
          'What is 144 divided by 12? Reply with just the number.',
          'What is the capital of Australia? One word.',
          'Write a haiku about autumn leaves.',
          'Convert 5 miles to kilometres. One line.',
        ];
        yield* session.submitPrompt(prompts[0]);
        yield* Deferred.await(lookupStarted);
        for (const prompt of prompts.slice(1)) {
          yield* session.submitPrompt(prompt);
        }
        yield* session.waitForCompletion();

        const view = yield* report(session.feed, 'Scenario 1: parallel', prompts, start);
        yield* expectSettled(session.feed, view);
        expect(view.lanes.filter((lane) => lane.kind === 'light').length).toBeGreaterThanOrEqual(3);
        const byPrompt = (needle: string) =>
          view.lanes.find((lane) =>
            view.items.some(
              (item) =>
                item.lane === lane.id &&
                item.sender.role === 'user' &&
                item.blocks.some((block) => block._tag === 'text' && block.text.includes(needle)),
            ),
          );
        const division = byPrompt('144');
        const capital = byPrompt('Australia');
        expect(division && answerOf(view, division)).toContain('12');
        expect(capital && answerOf(view, capital)).toMatch(/Canberra/);
      },
      Effect.provide(layer()),
      TestHelpers.provideTestContext,
    ),
    { timeout: TIMEOUT },
  );

  it.live(
    'serial: five dependent prompts sent at once',
    Effect.fnUntraced(
      function* (_) {
        const start = Date.now();
        lookupStarted = undefined;
        const session = yield* AgentService.createSession({ skills: [LookupSkill] });
        const prompts = [
          'Pick a whole number between 3 and 9 and tell me which one you picked.',
          'Double the number you picked.',
          'Add 7 to that result.',
          'Square that result.',
          'Say the final result in French words.',
        ];
        for (const prompt of prompts) {
          yield* session.submitPrompt(prompt);
        }
        yield* session.waitForCompletion();

        const view = yield* report(session.feed, 'Scenario 2: serial', prompts, start);
        yield* expectSettled(session.feed, view);
        expect(view.lanes.length).toBeGreaterThanOrEqual(prompts.length);
      },
      Effect.provide(layer()),
      TestHelpers.provideTestContext,
    ),
    { timeout: TIMEOUT },
  );

  it.live(
    'mix: an independent prompt and a dependent one while a slow turn runs',
    Effect.fnUntraced(
      function* (_) {
        const start = Date.now();
        lookupStarted = yield* Deferred.make<void>();
        const session = yield* AgentService.createSession({ skills: [LookupSkill] });
        const prompts = [
          'Use the slow lookup tool on "the sea", then write a 4-line poem about the sea from the notes.',
          'What is 17 * 23? Reply with just the number.',
          'Translate the poem about the sea into French.',
        ];
        yield* session.submitPrompt(prompts[0]);
        yield* Deferred.await(lookupStarted);
        yield* session.submitPrompt(prompts[1]);
        yield* session.submitPrompt(prompts[2]);
        yield* session.waitForCompletion();

        const view = yield* report(session.feed, 'Scenario 3: mix', prompts, start);
        yield* expectSettled(session.feed, view);
        const history = (yield* TrajectoryStore.history(session.feed)).map(textOf);
        expect(history.some((text) => text.includes('391'))).toBe(true);
      },
      Effect.provide(layer()),
      TestHelpers.provideTestContext,
    ),
    { timeout: TIMEOUT },
  );
});
