//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Clock from 'effect/Clock';
import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { expect } from 'vitest';

import { ScriptedLanguageModel } from '@dxos/ai/testing';
import { Alarm, SessionStore, getAck, isQueued } from '@dxos/assistant';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Skill from '@dxos/compute/Skill';
import { type Database, Feed, Filter, Obj } from '@dxos/echo';
import { RuntimeProvider } from '@dxos/effect';
import { TestHelpers } from '@dxos/effect/testing';
import { DXN, EntityId } from '@dxos/keys';
import { Message } from '@dxos/types';

import { AssistantTestLayer } from '../testing/index.ts';
import * as AgentService from './AgentService.ts';

const { text, toolCall, scriptedAiService } = ScriptedLanguageModel;

EntityId.dangerouslyDisableRandomness();

/**
 * The agent's input queue and its alarms are feed state, so these exercise the whole loop —
 * enqueue, one-at-a-time dequeue, ack, cancel — through the real `AgentProcess` against a scripted
 * model (no fixtures, no recorded conversations).
 */

/** Held open by the test so a turn can be observed mid-flight, with more prompts arriving behind it. */
const Gate = Operation.make({
  meta: {
    key: DXN.make('com.example.operation.gate'),
    name: 'Gate',
    description: 'Runs until the test releases it. Takes no arguments.',
  },
  input: Schema.Struct({ label: Schema.String.annotate({ description: 'Label echoed back' }) }),
  output: Schema.String,
});

let gateStarted: Deferred.Deferred<void> | undefined;
let gateRelease: Deferred.Deferred<void> | undefined;

const handlers = OperationHandlerSet.make(
  Gate.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ label }) {
        yield* Deferred.succeed(gateStarted!, undefined);
        yield* Deferred.await(gateRelease!).pipe(Effect.uninterruptible);
        return `${label}: released`;
      }),
    ),
  ),
);

const GateSkill = Skill.make({
  key: 'org.dxos.skill.gate',
  name: 'Gate',
  tools: Skill.toolDefinitions({ operations: [Gate] }),
});

/**
 * Every turn is a single text reply, so turn count is what the assertions read. The script is drawn
 * from once per model call, so it carries more turns than any test here needs.
 */
const replyLayer = () =>
  AssistantTestLayer({
    types: [Alarm.Alarm],
    aiService: scriptedAiService(Array.from({ length: 12 }, () => ({ parts: [text('Acknowledged.')] }))),
  });

/** First turn parks in the gated tool; later turns reply plainly. */
const gatedLayer = () =>
  AssistantTestLayer({
    types: [Alarm.Alarm],
    operationHandlers: [handlers],
    skills: [GateSkill],
    aiService: scriptedAiService([
      { parts: [toolCall(Operation.toolName(Gate), { label: 'gate' })] },
      ...Array.from({ length: 8 }, () => ({ parts: [text('Gate released.')] })),
    ]),
  });

/** Prompts the reader wrote, in feed order — an ack-carrying turn message is one of these. */
const promptTexts = (messages: readonly Message.Message[]) =>
  messages.filter((message) => message.sender.role === 'user').map((message) => Message.extractText(message));

/**
 * Polls until no queued input remains. Needed instead of `waitForCompletion` whenever an alarm is
 * left pending: an alarm is pending work, so the process deliberately stays alive to fire it.
 */
const waitForQueueDrained = (feed: Feed.Feed) =>
  Effect.gen(function* () {
    const runtime = yield* Effect.context<Database.Service>();
    yield* Effect.promise(async () => {
      await expect
        .poll(
          () =>
            RuntimeProvider.runPromise(Effect.succeed(runtime))(
              new SessionStore().loadPending(feed).pipe(Effect.map((state) => state.pendingMessages.length)),
            ),
          { timeout: 15_000 },
        )
        .toBe(0);
    });
  });

/** Polls until a message in the feed acks `alarmId`. */
const waitForAlarmAcked = (feed: Feed.Feed, alarmId: string) =>
  Effect.gen(function* () {
    const runtime = yield* Effect.context<Database.Service>();
    yield* Effect.promise(async () => {
      await expect
        .poll(
          () =>
            RuntimeProvider.runPromise(Effect.succeed(runtime))(
              Feed.query(feed, Filter.type(Message.Message)).run.pipe(
                Effect.map((messages) => messages.some((message) => getAck(message) === alarmId)),
              ),
            ),
          { timeout: 15_000 },
        )
        .toBe(true);
    });
  });

const readFeed = (feed: Feed.Feed) =>
  Effect.gen(function* () {
    const store = new SessionStore();
    const items = yield* Feed.query(feed, Filter.everything()).run;
    const messages = items.filter(Obj.instanceOf(Message.Message));
    const pending = yield* store.loadPending(feed);
    return { items, messages, ...pending };
  });

describe('AgentProcess input queue (scripted)', () => {
  it.effect(
    'a submitted prompt is queued on the feed, then acked by the turn that consumes it',
    Effect.fnUntraced(
      function* (_) {
        const session = yield* AgentService.createSession();
        yield* session.submitPrompt('What is a feed?');
        yield* session.waitForCompletion();

        const { messages, pendingMessages } = yield* readFeed(session.feed);

        // Nothing left waiting, and every queued original is acked by a message in the feed.
        expect(pendingMessages).toEqual([]);
        const queuedOriginals = messages.filter(isQueued);
        expect(queuedOriginals.length).toBeGreaterThan(0);
        const acks = new Set(messages.map(getAck).filter((id) => id !== undefined));
        for (const original of queuedOriginals) {
          expect(acks.has(original.id)).toBe(true);
        }

        // The prompt reached the model, carried by the turn's own user message.
        expect(promptTexts(messages)).toContain('What is a feed?');
      },
      Effect.provide(replyLayer()),
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );

  it.effect(
    'several prompts submitted back to back all drain, in submission order',
    Effect.fnUntraced(
      function* (_) {
        const session = yield* AgentService.createSession();
        yield* session.submitPrompt('first');
        yield* session.submitPrompt('second');
        yield* session.submitPrompt('third');
        yield* session.waitForCompletion();

        const { messages, pendingMessages, pendingAlarms } = yield* readFeed(session.feed);

        expect(pendingMessages).toEqual([]);
        expect(pendingAlarms).toEqual([]);
        // Each queued original is acked, and the queue drained in submission order.
        const queuedOrder = messages.filter(isQueued).map((message) => Message.extractText(message));
        expect(Array.from(new Set(queuedOrder))).toEqual(['first', 'second', 'third']);
        for (const original of messages.filter(isQueued)) {
          expect(messages.some((message) => getAck(message) === original.id)).toBe(true);
        }
      },
      Effect.provide(replyLayer()),
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );

  it.effect(
    'a prompt submitted while a turn is in flight waits its turn rather than interrupting it',
    Effect.fnUntraced(
      function* (_) {
        gateStarted = yield* Deferred.make<void>();
        gateRelease = yield* Deferred.make<void>();

        const session = yield* AgentService.createSession({ skills: [GateSkill] });
        yield* session.submitPrompt('open the gate');

        // The first turn is parked inside the tool: enqueue behind it.
        yield* Deferred.await(gateStarted);
        yield* session.submitPrompt('queued while busy');

        // Still queued — the running turn has not consumed it.
        const during = yield* readFeed(session.feed);
        expect(during.pendingMessages.map((message) => Message.extractText(message))).toContain('queued while busy');

        yield* Deferred.succeed(gateRelease, undefined);
        yield* session.waitForCompletion();

        const after = yield* readFeed(session.feed);
        expect(after.pendingMessages).toEqual([]);
        // Both prompts ran: the one that arrived mid-turn waited rather than being lost.
        expect(promptTexts(after.messages)).toContain('queued while busy');
        expect(promptTexts(after.messages)).toContain('open the gate');
      },
      Effect.provide(gatedLayer()),
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );

  it.effect(
    'a queued prompt removed from the feed before its turn is never run',
    Effect.fnUntraced(
      function* (_) {
        gateStarted = yield* Deferred.make<void>();
        gateRelease = yield* Deferred.make<void>();

        const session = yield* AgentService.createSession({ skills: [GateSkill] });
        yield* session.submitPrompt('open the gate');

        yield* Deferred.await(gateStarted);
        yield* session.submitPrompt('cancel me');

        // Cancel is a plain feed removal, which takes the item out of the queue projection.
        const during = yield* readFeed(session.feed);
        const cancelling = during.pendingMessages.filter((message) => Message.extractText(message) === 'cancel me');
        expect(cancelling.length).toBeGreaterThan(0);
        yield* Feed.remove(session.feed, cancelling);
        expect((yield* readFeed(session.feed)).pendingMessages).toEqual([]);

        yield* Deferred.succeed(gateRelease, undefined);
        yield* session.waitForCompletion();

        const after = yield* readFeed(session.feed);
        expect(after.pendingMessages).toEqual([]);
        // The cancelled prompt never reached the model.
        expect(promptTexts(after.messages)).not.toContain('cancel me');
      },
      Effect.provide(gatedLayer()),
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );

  it.effect(
    'a queued prompt written straight to the feed is picked up (the queue is the feed, not an API)',
    Effect.fnUntraced(
      function* (_) {
        const session = yield* AgentService.createSession();
        const store = new SessionStore();

        // No `submitPrompt`: this is what another peer or a background writer does.
        yield* store.enqueueMessage(
          session.feed,
          Message.make({ sender: { role: 'user' }, blocks: [{ _tag: 'text', text: 'written directly' }] }),
        );
        // Nudge the process the same way a Tier-B enqueue does; without a wake it stays hibernated.
        yield* session.submitPrompt('and one through the API');
        yield* session.waitForCompletion();

        const { messages, pendingMessages } = yield* readFeed(session.feed);
        expect(pendingMessages).toEqual([]);
        expect(promptTexts(messages)).toContain('written directly');
      },
      Effect.provide(replyLayer()),
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );
});

describe('AgentProcess alarms (scripted)', () => {
  it.effect(
    'a due alarm wakes the agent, is acked, and leaves nothing pending',
    Effect.fnUntraced(
      function* (_) {
        const session = yield* AgentService.createSession();
        const store = new SessionStore();

        // Already due, so the process fires it on its next wake.
        const alarm = yield* store.setAlarm(session.feed, {
          wakeAt: (yield* Clock.currentTimeMillis) - 1_000,
          message: 'check the build',
        });
        yield* session.submitPrompt('starting work');
        yield* session.waitForCompletion();

        const { messages, pendingAlarms } = yield* readFeed(session.feed);
        expect(pendingAlarms).toEqual([]);
        expect(messages.some((message) => getAck(message) === alarm.id)).toBe(true);
        // The reminder reached the model in the wake-up prompt.
        expect(promptTexts(messages).join('\n')).toContain('check the build');
      },
      Effect.provide(replyLayer()),
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );

  it.effect(
    'a future alarm stays pending and does not fire',
    Effect.fnUntraced(
      function* (_) {
        const session = yield* AgentService.createSession();
        const store = new SessionStore();

        const alarm = yield* store.setAlarm(session.feed, {
          wakeAt: (yield* Clock.currentTimeMillis) + 60 * 60_000,
          message: 'much later',
        });
        yield* session.submitPrompt('hello');
        // NOT `waitForCompletion`: a pending alarm is pending work by design, so the process stays
        // alive to fire it and never settles. Wait for the turn's reply instead.
        yield* waitForQueueDrained(session.feed);

        const { messages, pendingAlarms } = yield* readFeed(session.feed);
        expect(pendingAlarms.map((entry) => entry.id)).toEqual([alarm.id]);
        expect(messages.some((message) => getAck(message) === alarm.id)).toBe(false);
        expect(promptTexts(messages).join('\n')).not.toContain('much later');
      },
      Effect.provide(replyLayer()),
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );

  it.effect(
    'several alarms may be pending at once; the earliest due one fires first',
    Effect.fnUntraced(
      function* (_) {
        const session = yield* AgentService.createSession();
        const store = new SessionStore();

        const later = yield* store.setAlarm(session.feed, {
          wakeAt: (yield* Clock.currentTimeMillis) + 60 * 60_000,
          message: 'later',
        });
        const due = yield* store.setAlarm(session.feed, {
          wakeAt: (yield* Clock.currentTimeMillis) - 1_000,
          message: 'sooner',
        });
        yield* session.submitPrompt('go');
        // The `later` alarm keeps the process alive, so poll for the due one being consumed.
        yield* waitForAlarmAcked(session.feed, due.id);

        const { messages, pendingAlarms } = yield* readFeed(session.feed);
        // Setting the second alarm did not replace the first (the old single-cell behaviour).
        expect(pendingAlarms.map((entry) => entry.id)).toEqual([later.id]);
        expect(messages.some((message) => getAck(message) === due.id)).toBe(true);
      },
      Effect.provide(replyLayer()),
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );

  it.effect(
    'a cancelled alarm never fires',
    Effect.fnUntraced(
      function* (_) {
        const session = yield* AgentService.createSession();
        const store = new SessionStore();

        const alarm = yield* store.setAlarm(session.feed, {
          wakeAt: (yield* Clock.currentTimeMillis) - 1_000,
          message: 'cancelled',
        });
        yield* store.cancelAlarm(session.feed, alarm);

        yield* session.submitPrompt('go');
        yield* session.waitForCompletion();

        const { messages, pendingAlarms } = yield* readFeed(session.feed);
        expect(pendingAlarms).toEqual([]);
        expect(messages.some((message) => getAck(message) === alarm.id)).toBe(false);
        expect(promptTexts(messages).join('\n')).not.toContain('cancelled');
      },
      Effect.provide(replyLayer()),
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );
});
