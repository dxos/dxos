//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { type AiService } from '@dxos/ai';
import { ScriptedLanguageModel } from '@dxos/ai/testing';
import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { Database, DXN, Feed, Filter, Ref, Tag } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { Cursor } from '@dxos/link';
import { TagIndex } from '@dxos/schema';
import { Message, Organization, Person } from '@dxos/types';

import { InboxOperationHandlerSet } from '#operations';
import { InboxCapabilities, InboxOperation, Mailbox } from '#types';

import { inboxMailboxProcessors } from '../../capabilities/mailbox-processors';

/** A service no layer in this test provides — the whole point of the stub below. */
class MissingService extends Context.Service<MissingService, { readonly unused: true }>()(
  '@dxos/plugin-inbox/testing/MissingService',
) {}

/**
 * An operation declaring a service nothing contributes, standing in for the real misconfiguration:
 * a processor whose own plugin failed to provide something it declared. Purpose-built rather than
 * borrowed from a shipped operation, so the test exercises the gate itself and cannot be invalidated
 * by that operation later gaining or losing a dependency — which is exactly what happened when
 * `AnalyzeMailbox` moved to plugin-brain.
 */
const StubOperation = Operation.make({
  meta: { key: DXN.make('com.example.operation.inbox.testing.stub'), name: 'Stub' },
  services: [MissingService],
  input: Schema.Struct({ mailbox: Ref.Ref(Mailbox.Mailbox) }),
  output: Schema.Void,
});

const StubHandlerSet = OperationHandlerSet.make(StubOperation.pipe(Operation.withHandler(() => Effect.void)));

/** Contributed into the `analyze` slot, so the cascade reaches it exactly where brain's pass would sit. */
const analyzeProcessor: InboxCapabilities.MailboxProcessor = {
  id: 'analyze',
  tier: 'analyze',
  after: ['summarize'],
  createInvocations: (mailbox) => [{ operation: StubOperation, input: { mailbox: Ref.make(mailbox) } }],
};

/**
 * The processors plugin-inbox itself contributes, resolved through the real capability manager — the
 * cascade reads only contributions, so a test that stubbed a plan instead would exercise a path the
 * app never takes.
 */
const capabilityService = (processors: readonly InboxCapabilities.MailboxProcessor[] = inboxMailboxProcessors) => {
  const manager = CapabilityManager.make({ registry: Registry.make() });
  for (const processor of processors) {
    manager.contribute({
      interface: InboxCapabilities.MailboxProcessor,
      implementation: processor,
      module: `plugin-inbox/mailbox-processors/${processor.id}`,
    });
  }
  return manager;
};

/**
 * The cascade reads its processors from the capability and nothing else, so the test layer has to
 * contribute them the way the app does — `extraServices`, not an ambient `provideService`, because the
 * operation runtime resolves declared services through the ServiceResolver rather than the caller's
 * Effect context.
 */
const makeTestLayer = (
  processors: readonly InboxCapabilities.MailboxProcessor[] = inboxMailboxProcessors,
  { aiService }: { aiService?: Layer.Layer<AiService.AiService> } = {},
) =>
  AssistantTestLayer({
    operationHandlers: [InboxOperationHandlerSet.handlers, StubHandlerSet],
    types: [
      Cursor.Cursor,
      Feed.Feed,
      Mailbox.Mailbox,
      Message.Message,
      Organization.Organization,
      Person.Person,
      Tag.Tag,
      TagIndex.TagIndex,
    ],
    disableLlmMemoization: true,
    aiService,
    extraServices: Layer.sync(Capability.Service, () => capabilityService(processors)),
  });

const TestLayer = makeTestLayer();

/**
 * Every model call fails as script-exhausted, so a test needing an AI tier to FAIL pins that
 * outcome itself instead of inheriting whether the run happened to have a usable API key.
 */
const failingAiService = ScriptedLanguageModel.scriptedAiService([]);

const makeFailingAiLayer = (processors?: readonly InboxCapabilities.MailboxProcessor[]) =>
  makeTestLayer(processors, { aiService: failingAiService });

const ME = ['me@example.com'];

const withAnalyze = [...inboxMailboxProcessors, analyzeProcessor];

const makeMessage = (email: string, subject: string, index: number, listUnsubscribe?: string) =>
  Message.make({
    created: new Date(Date.parse('2026-07-01T00:00:00.000Z') + index * 60_000).toISOString(),
    sender: { email },
    blocks: [{ _tag: 'text', text: `Body of ${subject}` }],
    properties: { subject, to: 'me@example.com', references: '<prior@example.com>', listUnsubscribe },
  });

const seedMailbox = Effect.fnUntraced(function* () {
  const { db } = yield* Database.Service;
  const mailbox = db.add(Mailbox.make({ name: 'Inbox' }));
  const feed = yield* Database.load(mailbox.feed);
  yield* Effect.promise(() =>
    db.appendToFeed(feed, [
      makeMessage('bob@example.com', 'Re: Lunch', 0),
      makeMessage('news@bulk.io', 'Re: Weekly digest', 1, '<https://bulk.io/u>'),
    ]),
  );
  yield* Effect.promise(() => db.flush());
  return { db, mailbox };
});

describe('AnalyzeMailbox cascade', () => {
  it.effect(
    'runs the deterministic tier in order and reports each spawned stage',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { mailbox } = yield* seedMailbox();

        const result = yield* Operation.invoke(InboxOperation.AnalyzeMailbox, {
          mailbox: Ref.make(mailbox),
          me: ME,
          tiers: ['deterministic'],
        });

        expect(result.completed).toBe(2);
        expect(result.failed).toBe(0);
        // Contacts first: classification's allow-list is built before any model sees a message.
        expect(result.stages.map((stage) => stage.processor)).toEqual(['contacts', 'subscriptions']);
        expect(result.stages.every((stage) => stage.status === 'completed')).toBe(true);

        // Each spawned operation actually ran: a Person for the replied-to sender, a subscription
        // for the bulk sender.
        const people = yield* Database.query(Filter.type(Person.Person)).run;
        expect(people.map((person) => person.emails?.[0]?.value)).toEqual(['bob@example.com']);
        expect(mailbox.subscriptions?.map((subscription) => subscription.email)).toEqual(['news@bulk.io']);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'skips the correspondent stage without identity addresses, and is idempotent across reruns',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { mailbox } = yield* seedMailbox();

        const first = yield* Operation.invoke(InboxOperation.AnalyzeMailbox, {
          mailbox: Ref.make(mailbox),
          tiers: ['deterministic'],
        });
        expect(first.skipped).toBe(1);
        expect(first.stages[0]).toMatchObject({ status: 'skipped', error: 'no identity addresses supplied' });
        expect((yield* Database.query(Filter.type(Person.Person)).run).length).toBe(0);

        // The cascade inherits each operation's idempotency: a rerun creates nothing new.
        const rerun = yield* Operation.invoke(InboxOperation.AnalyzeMailbox, {
          mailbox: Ref.make(mailbox),
          me: ME,
          tiers: ['deterministic'],
        });
        expect(rerun.completed).toBe(2);
        const again = yield* Operation.invoke(InboxOperation.AnalyzeMailbox, {
          mailbox: Ref.make(mailbox),
          me: ME,
          tiers: ['deterministic'],
        });
        expect(again.completed).toBe(2);
        expect((yield* Database.query(Filter.type(Person.Person)).run).length).toBe(1);
        expect(mailbox.subscriptions).toHaveLength(1);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'runs the tiers in cascade order however the caller lists them',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { mailbox } = yield* seedMailbox();

        // `tiers` is a SET: a caller naming the cheap LLM tier before the deterministic one must not
        // get a classification pass whose contact allow-list has not been built yet. Classification
        // fails on the scripted model, which is what pins the order — the deterministic stages ran
        // first and the failure lands on the third stage, not the first.
        const result = yield* Operation.invoke(InboxOperation.AnalyzeMailbox, {
          mailbox: Ref.make(mailbox),
          me: ME,
          tiers: ['classify', 'deterministic'],
        });

        expect(result.stages.map((stage) => stage.tier)).toEqual(['deterministic', 'deterministic', 'classify']);
        expect(result.stages.map((stage) => stage.status)).toEqual(['completed', 'completed', 'failed']);
      },
      Effect.provide(makeFailingAiLayer()),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'skips the AI tiers instead of failing when no resolver serves the model',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { mailbox } = yield* seedMailbox();

        // The app's real condition: `AiService` is in the stack but no resolver claims the model —
        // plugin-assistant contributes the Anthropic one on its own Start event, so a run before the
        // assistant is up asks for a model nobody serves. That is a precondition, not a fault: the
        // deterministic work stands, the cascade reports no failure, and each AI tier says why it did
        // not run (rather than the first one being blamed for the rest).
        // `analyze` is included: it is missing a DIFFERENT precondition (a FactStore no plugin here
        // contributes), so one run exercises both flavours and shows each tier naming its own reason
        // rather than inheriting the first one's.
        const result = yield* Operation.invoke(InboxOperation.AnalyzeMailbox, {
          mailbox: Ref.make(mailbox),
          me: ME,
          tiers: ['deterministic', 'classify', 'summarize', 'analyze'],
          model: 'com.example.model.does-not-exist.default',
        });

        expect(result.failed).toBe(0);
        expect(result.completed).toBe(2);
        expect(result.stages.map((stage) => stage.status)).toEqual([
          'completed',
          'completed',
          'skipped',
          'skipped',
          'skipped',
        ]);
        for (const stage of result.stages.slice(2, 4)) {
          expect(stage.error).toBe('ai unavailable (assistant not ready)');
        }
        expect(result.stages.at(-1)).toMatchObject({
          tier: 'analyze',
          error: '@dxos/plugin-inbox/testing/MissingService unavailable',
        });

        // The deterministic tier's writes are intact.
        expect((yield* Database.query(Filter.type(Person.Person)).run).length).toBe(1);
      },
      Effect.provide(makeTestLayer(withAnalyze)),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'skips a tier whose service no plugin contributed, rather than failing the cascade',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { mailbox } = yield* seedMailbox();

        // `analyze` declares `FactStore`, which only plugin-brain contributes; this layer has no such
        // provider, so the process invoker rejects at spawn time. That is the same class of unmet
        // precondition as an absent `AiService` — the host app did not contribute something a tier
        // declared — and must be reported the same way, or one uninstalled plugin turns a healthy
        // mailbox's scan red and strands the deterministic work behind it.
        const result = yield* Operation.invoke(InboxOperation.AnalyzeMailbox, {
          mailbox: Ref.make(mailbox),
          me: ME,
          tiers: ['deterministic', 'analyze'],
        });

        expect(result.failed).toBe(0);
        expect(result.completed).toBe(2);
        expect(result.stages.map((stage) => stage.status)).toEqual(['completed', 'completed', 'skipped']);
        expect(result.stages.at(-1)?.error).toContain('unavailable');

        // The deterministic tier's writes survive the skip.
        expect((yield* Database.query(Filter.type(Person.Person)).run).length).toBe(1);
      },
      Effect.provide(makeTestLayer(withAnalyze)),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'a failure blocks only its descendants, leaving independent branches to run',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { mailbox } = yield* seedMailbox();

        // `classify` fails on the scripted model. `subscriptions` declares no edge
        // to it, so it must still run — blocking by run POSITION would have stranded it purely for
        // sitting later in the list, which is the whole point of taking the order from the DAG.
        const result = yield* Operation.invoke(InboxOperation.AnalyzeMailbox, {
          mailbox: Ref.make(mailbox),
          me: ME,
          tiers: ['deterministic', 'classify', 'summarize'],
        });

        const byProcessor = new Map(result.stages.map((stage) => [stage.processor, stage]));
        expect(byProcessor.get('classify')?.status).toBe('failed');
        expect(byProcessor.get('contacts')?.status).toBe('completed');
        expect(byProcessor.get('subscriptions')?.status).toBe('completed');
        // summarize declares after: ['contacts', 'classify'], so it IS a descendant.
        expect(byProcessor.get('summarize')).toMatchObject({
          status: 'skipped',
          error: "upstream 'classify' failed",
        });
        expect(result.completed).toBe(2);
        expect(result.failed).toBe(1);
      },
      Effect.provide(makeFailingAiLayer()),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'runs a processor contributed by another plugin, in its position rather than its contribution order',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { mailbox } = yield* seedMailbox();

        const result = yield* Operation.invoke(InboxOperation.AnalyzeMailbox, {
          mailbox: Ref.make(mailbox),
          me: ME,
          tiers: ['deterministic'],
        });

        // Contributed FIRST but declared `after: ['subscriptions']`, so running last is the topology
        // doing its job — contribution order alone would have put it at the front.
        expect(result.stages.map((stage) => stage.processor)).toEqual(['contacts', 'subscriptions', 'thirdParty']);
        expect(result.completed).toBe(3);
      },
      Effect.provide(
        makeTestLayer([
          {
            id: 'thirdParty',
            tier: 'deterministic',
            after: ['subscriptions'],
            createInvocations: (mailbox) => [
              {
                operation: InboxOperation.ExtractSubscriptions,
                input: { mailbox: Ref.make(mailbox) },
              },
            ],
          },
          ...inboxMailboxProcessors.filter((processor) => processor.tier === 'deterministic'),
        ]),
      ),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'reports processors caught in a dependency cycle instead of dropping them',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { mailbox } = yield* seedMailbox();

        // One contributor shipping a cycle must not cost everyone else their run, and the members must
        // be named — silence here would look exactly like a pass that ran and found nothing.
        const result = yield* Operation.invoke(InboxOperation.AnalyzeMailbox, {
          mailbox: Ref.make(mailbox),
          me: ME,
          tiers: ['deterministic'],
        });

        expect(result.completed).toBe(2);
        expect(result.failed).toBe(0);
        const cycled = result.stages.filter((stage) => stage.status === 'skipped');
        expect(cycled.map((stage) => stage.processor).sort()).toEqual(['x', 'y']);
        for (const stage of cycled) {
          expect(stage.error).toBe('dependency cycle among [x, y]');
        }
      },
      Effect.provide(
        makeTestLayer([
          ...inboxMailboxProcessors.filter((processor) => processor.tier === 'deterministic'),
          {
            id: 'x',
            tier: 'deterministic',
            after: ['y'],
            createInvocations: (mailbox) => [
              {
                operation: InboxOperation.ExtractSubscriptions,
                input: { mailbox: Ref.make(mailbox) },
              },
            ],
          },
          {
            id: 'y',
            tier: 'deterministic',
            after: ['x'],
            createInvocations: (mailbox) => [
              {
                operation: InboxOperation.ExtractSubscriptions,
                input: { mailbox: Ref.make(mailbox) },
              },
            ],
          },
        ]),
      ),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'a tier filter drops the edges that ran through the filtered-out processor',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { mailbox } = yield* seedMailbox();

        // `analyze` declares after: ['summarize'], but `summarize` is not among the selected tiers, so
        // that edge points at an absent processor and is ignored — leaving `analyze` with no path to
        // `classify`. It therefore RUNS despite the classification failure, and skips on its own unmet
        // precondition instead. Sharp but correct: a processor the caller excluded cannot constrain
        // anything, and `analyze` never consumed classification in the first place.
        const result = yield* Operation.invoke(InboxOperation.AnalyzeMailbox, {
          mailbox: Ref.make(mailbox),
          me: ME,
          tiers: ['deterministic', 'classify', 'analyze'],
        });

        expect(result.failed).toBe(1);
        expect(result.stages.map((stage) => stage.status)).toEqual(['completed', 'completed', 'failed', 'skipped']);
        expect(result.stages.at(-1)).toMatchObject({
          tier: 'analyze',
          status: 'skipped',
          error: '@dxos/plugin-inbox/testing/MissingService unavailable',
        });
      },
      Effect.provide(makeFailingAiLayer(withAnalyze)),
      TestHelpers.provideTestContext,
    ),
  );
});
