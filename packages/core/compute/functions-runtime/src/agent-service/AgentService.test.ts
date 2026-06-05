//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom';
import { describe, it } from '@effect/vitest';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';
import * as TestClock from 'effect/TestClock';
import { expect } from 'vitest';

import { MemoizedAiService } from '@dxos/ai/testing';
import { PartialBlock } from '@dxos/assistant';
import { Blueprint, Operation, OperationHandlerSet, Trace } from '@dxos/compute';
import { Process } from '@dxos/compute';
import { Feed, Filter, Obj } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { AssistantTestLayer } from '@dxos/functions-runtime/testing';
import { DXN, EntityId } from '@dxos/keys';
import { log } from '@dxos/log';
import { Message, Organization } from '@dxos/types';
import { trim } from '@dxos/util';

import * as AgentService from './AgentService';

EntityId.dangerouslyDisableRandomness();

//
// Test data.
//

const TEST_DATA = {
  organizations: [
    Organization.make({
      name: 'Cyberdyne Systems',
      website: 'https://cyberdyne.com',
    }),
    Organization.make({
      name: 'Acme Robotics',
      website: 'https://acmerobotics.example',
    }),
    Organization.make({
      name: 'Globex Research',
      website: 'https://globex.example',
    }),
  ],
  research: {
    'https://cyberdyne.com': `
      Cyberdyne Systems is a company that builds AI agents.
      They are based in San Francisco, California.
      They were founded in 1984.
      They are a public company.
      They are listed on the NASDAQ under the symbol CYBR.
      They are a member of the S&P 500 index.
    `,
    'https://acmerobotics.example': `
      Acme Robotics designs industrial automation and collaborative robots.
      They are headquartered in Austin, Texas.
      They were founded in 2010.
      They serve manufacturing and logistics customers worldwide.
    `,
    'https://globex.example': `
      Globex Research runs applied R&D labs focused on materials science and energy storage.
      They are based in Cambridge, Massachusetts.
      They partner with universities and government grants programs.
      Their flagship product line is solid-state battery prototypes for EVs.
    `,
  } as Record<string, string>,
};

const Research = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.research'),
    name: 'Research',
    description: 'Research an organization',
  },
  input: Schema.Struct({
    website: Schema.String.annotations({ description: 'The website of the organization to research' }),
  }),
  output: Schema.String,
});

const handlers = OperationHandlerSet.make(
  Research.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ website }) {
        log.info('begin research', { website });
        yield* Effect.sleep(
          15_000 * (TEST_DATA.organizations.findIndex((organization) => organization.website === website) + 1),
        );
        log.info('end research', { website });
        return TEST_DATA.research[website];
      }),
    ),
  ),
);

const ResearchBlueprint = Blueprint.make({
  key: 'org.dxos.blueprint.research',
  name: 'Research',
  tools: Blueprint.toolDefinitions({ operations: [Research] }),
});

//
// Test layer: AI services + toolkit.
//

const SYSTEM_PROMPT = trim`
  You are reacting to a continuous stream of organizations.
  Research each organization.
  Research takes a while to complete.
  Do not block on the research since there might be more organizations to research, and we want research to happen in parallel.
  Do not wait longer then 3 seconds to keep the conversation open for new events or user queries.
  Do internal reasoning, but only show the answers to the user.
`;

const TestLayer = AssistantTestLayer({
  types: [Organization.Organization, Feed.Feed, Blueprint.Blueprint],
  tracing: 'console',
  aiServicePreset: 'edge-remote',
  operationHandlers: [handlers],
  blueprints: [ResearchBlueprint],
  systemPrompt: SYSTEM_PROMPT,
  enableToolBackgrounding: true,
});

describe('Agent Executable', () => {
  // TODO(dmaretskyi): Figure out how to make it not sleep for 45 seconds.
  it.scoped.skip(
    'runs AI agent with background tools via process manager',
    Effect.fnUntraced(
      function* (_) {
        const registry = yield* Registry.AtomRegistry;
        const monitor = yield* Process.ProcessMonitorService;
        registry.subscribe(monitor.processTreeAtom, (tree) => {
          console.log(`\n----- Process tree -----\n${Process.prettyProcessTree(tree)}\n-----------------\n`);
        });

        const agent = yield* AgentService.createSession({
          blueprints: [ResearchBlueprint],
        });

        let ephemeralEventCount = 0;
        yield* agent.subscribeEphemeral().pipe(
          Stream.runForEach((msg) =>
            Effect.gen(function* () {
              for (const event of msg.events) {
                if (Trace.isOfType(PartialBlock, event)) {
                  ephemeralEventCount++;
                }
              }
            }),
          ),
          Effect.fork,
        );

        for (const org of TEST_DATA.organizations) {
          yield* agent.submitPrompt(JSON.stringify(org));
        }
        yield* agent.submitPrompt('When all research is complete, print 1-sentence summary for each organization.');
        yield* agent.waitForCompletion();
        expect(ephemeralEventCount).toBeGreaterThan(0);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 120_000 },
  );
});

//
// Alarm e2e (memoized LLM).
//

const ALARM_SYSTEM_PROMPT = trim`
  You are a helpful assistant with access to alarm tools (set-alarm, get-current-date).
  When asked to set an alarm, you MUST call the set-alarm tool with the requested duration.
  Do not pretend to set an alarm in text — always use the set-alarm tool.
  After the tool succeeds, briefly confirm the alarm was scheduled and stop.
  When you receive a wake-up notification that your alarm fired, acknowledge it briefly in text.
`;

const AlarmTestLayer = AssistantTestLayer({
  types: [Organization.Organization, Feed.Feed],
  systemPrompt: ALARM_SYSTEM_PROMPT,
  aiServicePreset: 'direct',
  model: 'ai.claude.model.claude-sonnet-4-5',
});

/**
 * Summarizes assistant text blocks and tool-call blocks persisted to the conversation feed.
 */
const countBlocks = (feed: Feed.Feed) =>
  Effect.gen(function* () {
    const queryResult = yield* Feed.query(feed, Filter.type(Message.Message));
    const messages = (yield* Effect.promise(() => queryResult.run())).filter(Obj.instanceOf(Message.Message));
    let assistantTexts = 0;
    let setAlarmCalls = 0;
    for (const message of messages) {
      for (const block of message.blocks) {
        if (message.sender.role === 'assistant' && block._tag === 'text') {
          assistantTexts++;
        }
        if (block._tag === 'toolCall' && block.name === 'set-alarm') {
          setAlarmCalls++;
        }
      }
    }
    return { assistantTexts, setAlarmCalls };
  });

/**
 * Polls until `predicate` holds. Each iteration advances the TestClock (for alarm scheduling) and
 * yields real wall time so async I/O such as memoized LLM HTTP can complete.
 */
const driveUntil = <R>(predicate: Effect.Effect<boolean, never, R>) =>
  Effect.gen(function* () {
    for (let step = 0; step < 120; step++) {
      if (yield* predicate) {
        return;
      }
      yield* TestClock.adjust(Duration.millis(50));
      yield* Effect.promise(() => new Promise<void>((resolve) => setTimeout(resolve, 250)));
    }
    return yield* Effect.dieMessage('driveUntil: condition not reached');
  });

describe('Agent alarms', () => {
  it.scoped(
    'agent schedules a self-wake and resumes when its alarm fires (TestClock)',
    Effect.fnUntraced(
      function* (_) {
        const agent = yield* AgentService.createSession({});

        yield* agent.submitPrompt('Use the set-alarm tool to schedule a wake-up in 1 hour.');

        // First request: the agent calls `set-alarm` then finishes, leaving a self-wake armed ~1h out.
        yield* driveUntil(countBlocks(agent.feed).pipe(Effect.map(({ setAlarmCalls }) => setAlarmCalls >= 1)));
        expect((yield* countBlocks(agent.feed)).setAlarmCalls).toBe(1);

        // The process is hibernating until the self-wake fires. Advancing the clock past it resumes
        // the agent, which produces a second response.
        yield* TestClock.adjust(Duration.hours(1));
        yield* driveUntil(countBlocks(agent.feed).pipe(Effect.map(({ assistantTexts }) => assistantTexts >= 2)));
        yield* agent.waitForCompletion();

        const final = yield* countBlocks(agent.feed);
        expect(final.setAlarmCalls).toBe(1);
        expect(final.assistantTexts).toBeGreaterThanOrEqual(2);
      },
      Effect.provide(AlarmTestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: MemoizedAiService.isGenerationEnabled() ? 240_000 : 30_000 },
  );
});
