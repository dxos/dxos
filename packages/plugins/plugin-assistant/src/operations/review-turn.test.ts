//
// Copyright 2026 DXOS.org
//

import { beforeEach, describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Layer from 'effect/Layer';
import * as Atom from 'effect/reactivity/Atom';
import * as AtomRegistry from 'effect/reactivity/AtomRegistry';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { ScriptedLanguageModel } from '@dxos/ai/testing';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import { Database, Feed, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { Observability } from '@dxos/observability';
import * as ObservabilityCapabilities from '@dxos/plugin-observability/ObservabilityCapabilities';
import { Message } from '@dxos/types';

import { AssistantOperationHandlerSet } from '#operations';
import { type Assistant, AssistantCapabilities, AssistantOperation } from '#types';

import { STRUGGLE_EVENT, type TurnVerdict } from '../review/turn-review.ts';

EntityId.dangerouslyDisableRandomness();

const VERDICT: TurnVerdict = {
  struggled: true,
  cause: 'tool_faulty',
  severity: 'medium',
  summary: 'The search tool rejected a valid query.',
  tools: ['search'],
};

type Captured = {
  events: { event: string; attributes?: Record<string, unknown> }[];
  uploads: { ndjson: string; kind: string }[];
};

let captured: Captured;
let manager: ReturnType<typeof CapabilityManager.make>;
let settingsAtom: Atom.Writable<Assistant.Settings>;

/** A real {@link Observability} over one recording extension, so the handler sees the production API. */
const makeObservability = (enabled: boolean) =>
  Effect.runSync(
    Function.pipe(
      Observability.make(),
      Observability.addExtension(
        Effect.succeed({
          enabled,
          apis: [
            {
              kind: 'events',
              isAvailable: () => Effect.succeed(true),
              captureEvent: (event, attributes) => void captured.events.push({ event, attributes }),
            },
            {
              kind: 'support',
              isAvailable: () => Effect.succeed(true),
              uploadLogs: async () => undefined,
              uploadNdjson: async (ndjson, kind) => {
                captured.uploads.push({ ndjson, kind });
                return 'trajectories/2026-10-06/test.ndjson.gz';
              },
              sessionContext: () => undefined,
              flushLogs: async () => {},
            },
          ],
        }),
      ),
    ),
  );

const setup = ({ reportStruggles, telemetry }: { reportStruggles: boolean; telemetry: boolean }) => {
  const registry = AtomRegistry.make();
  manager = CapabilityManager.make({ registry });
  settingsAtom = Atom.make<Assistant.Settings>({ reportStruggles, codeMode: true }).pipe(Atom.keepAlive);
  manager.contribute({ module: 'test', interface: Capabilities.AtomRegistry, implementation: registry });
  manager.contribute({ module: 'test', interface: AssistantCapabilities.Settings, implementation: settingsAtom });
  manager.contribute({
    module: 'test',
    interface: ObservabilityCapabilities.Observability,
    implementation: makeObservability(telemetry),
  });
};

const TestLayer = AssistantTestLayer({
  operationHandlers: AssistantOperationHandlerSet,
  types: [Chat.Chat, Feed.Feed, Message.Message],
  aiService: ScriptedLanguageModel.scriptedAiService(() => ({
    parts: [ScriptedLanguageModel.text(JSON.stringify(VERDICT))],
  })),
  extraServices: Layer.sync(Capability.Service, () => manager),
});

const SINCE = '2026-10-06T10:00:00.000Z';

const makeChat = Effect.fnUntraced(function* () {
  const { db } = yield* Database.Service;
  const feed = db.add(Feed.make());
  const chat = db.add(Chat.make({ feed: Ref.make(feed) }));
  yield* Feed.append(feed, [
    Message.make({ created: SINCE, sender: 'user', blocks: [{ _tag: 'text', text: 'Find my notes.' }] }),
    Message.make({
      created: '2026-10-06T10:00:01.000Z',
      sender: 'assistant',
      blocks: [
        { _tag: 'toolCall', toolCallId: '1', name: 'search', input: '{"query":"notes"}', providerExecuted: false },
      ],
    }),
  ]);
  yield* Database.flush();
  return chat;
});

const review = (chat: Chat.Chat) =>
  Operation.invoke(AssistantOperation.ReviewTurn, {
    chat,
    outcome: 'success',
    since: SINCE,
    model: 'dxn:com.anthropic.model.claude-sonnet-5.default',
    skills: ['Markdown', 'Tables'],
  });

describe('ReviewTurn', () => {
  beforeEach(() => {
    captured = { events: [], uploads: [] };
  });

  it.effect(
    'reports a prompting or tooling struggle with its trajectory',
    Effect.fnUntraced(
      function* (_) {
        setup({ reportStruggles: true, telemetry: true });
        yield* review(yield* makeChat());

        expect(captured.uploads).toHaveLength(1);
        expect(captured.uploads[0].kind).toBe('trajectory');
        expect(captured.uploads[0].ndjson.split('\n')).toHaveLength(3);
        expect(captured.events).toHaveLength(1);
        expect(captured.events[0].event).toBe(STRUGGLE_EVENT);
        expect(captured.events[0].attributes).toMatchObject({
          model: 'dxn:com.anthropic.model.claude-sonnet-5.default',
          code_mode: true,
          skills: 'Markdown,Tables',
          cause: 'tool_faulty',
          cause_group: 'tooling',
          turn_tool_call_count: 1,
          trajectory_key: 'trajectories/2026-10-06/test.ndjson.gz',
        });
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'does nothing unless the user opted in',
    Effect.fnUntraced(
      function* (_) {
        setup({ reportStruggles: false, telemetry: true });
        yield* review(yield* makeChat());
        expect(captured).toEqual({ events: [], uploads: [] });
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'does nothing while telemetry is off',
    Effect.fnUntraced(
      function* (_) {
        setup({ reportStruggles: true, telemetry: false });
        yield* review(yield* makeChat());
        expect(captured).toEqual({ events: [], uploads: [] });
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
