//
// Copyright 2026 DXOS.org
//

import { beforeEach, describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Layer from 'effect/Layer';
import * as Atom from 'effect/reactivity/Atom';
import * as AtomRegistry from 'effect/reactivity/AtomRegistry';

import { AgentService } from '@dxos/agent-runtime';
import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { ScriptedLanguageModel } from '@dxos/ai/testing';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import * as Chat from '@dxos/assistant/Chat';
import { ProcessManager } from '@dxos/compute-runtime';
import * as Process from '@dxos/compute/Process';
import * as Skill from '@dxos/compute/Skill';
import { Feed, Obj } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { DXN, EntityId } from '@dxos/keys';
import * as Observability from '@dxos/observability/Observability';
import * as ObservabilityCapabilities from '@dxos/plugin-observability/ObservabilityCapabilities';
import { Message } from '@dxos/types';

import { AssistantOperationHandlerSet } from '#operations';
import { TurnReviewSkill } from '#skills';
import { type Assistant, AssistantCapabilities } from '#types';

import { REVIEW_SYSTEM_PROMPT, STRUGGLE_EVENT, type TurnVerdict } from '../review/turn-review.ts';

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

let captured: Captured = { events: [], uploads: [] };
let telemetryEnabled = true;

/** A real {@link Observability} over one recording extension, so the handler sees the production API. */
const observability = Effect.runSync(
  Function.pipe(
    Observability.make(),
    Observability.addExtension(
      Effect.succeed({
        get enabled() {
          return telemetryEnabled;
        },
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

// One manager for the file: the test layer resolves `Capability.Service` before a test body runs, so
// each test varies the state the manager holds rather than the manager itself.
const registry = AtomRegistry.make();
const settingsAtom = Atom.make<Assistant.Settings>({}).pipe(Atom.keepAlive);
const manager = CapabilityManager.make({ registry });
manager.contribute({ module: 'test', interface: Capabilities.AtomRegistry, implementation: registry });
manager.contribute({ module: 'test', interface: AssistantCapabilities.Settings, implementation: settingsAtom });
manager.contribute({
  module: 'test',
  interface: ObservabilityCapabilities.Observability,
  implementation: observability,
});

const setup = ({ reportStruggles, telemetry }: { reportStruggles: boolean; telemetry: boolean }) => {
  registry.set(settingsAtom, { reportStruggles, codeMode: true });
  telemetryEnabled = telemetry;
};

const TestLayer = AssistantTestLayer({
  operationHandlers: AssistantOperationHandlerSet,
  types: [Chat.Chat, Feed.Feed, Message.Message, Skill.Skill],
  skills: [TurnReviewSkill.make()],
  // The reviewer gets the verdict; the conversational turn gets a plain reply.
  aiService: ScriptedLanguageModel.scriptedAiService((request) => ({
    parts: [
      ScriptedLanguageModel.text(
        request.system.includes(REVIEW_SYSTEM_PROMPT) ? JSON.stringify(VERDICT) : 'I could not search your notes.',
      ),
    ],
  })),
  extraServices: Layer.succeed(Capability.Service, manager),
});

const MODEL = DXN.make('com.anthropic.model.claude-sonnet-5.default');

/** Runs one turn with the turn-review skill bound and waits for the agent process, hooks included, to finish. */
const runTurn = Effect.fnUntraced(function* () {
  const session = yield* AgentService.createSession({ skills: [TurnReviewSkill.make()], model: MODEL });
  yield* session.submitPrompt('Find my notes.');
  yield* session.waitForCompletion();
  const processManager = yield* ProcessManager.ProcessManagerService;
  // The agent process finishes only after its background hooks, so its exit is the review's.
  const handles = yield* processManager.list({ target: Obj.getURI(session.chat) });
  expect(handles.length).toBeGreaterThan(0);
  yield* Effect.promise(async () => {
    await expect
      .poll(() => handles.every((handle) => handle.status.state === Process.State.SUCCEEDED), { timeout: 10_000 })
      .toBe(true);
  });
});

describe('AnalyzeTurn', () => {
  beforeEach(() => {
    captured = { events: [], uploads: [] };
  });

  it.effect(
    'reports a prompting or tooling struggle with its trajectory',
    Effect.fnUntraced(
      function* (_) {
        setup({ reportStruggles: true, telemetry: true });
        yield* runTurn();

        expect(captured.uploads).toHaveLength(1);
        expect(captured.uploads[0].kind).toBe('trajectory');
        const [header, ...messages] = captured.uploads[0].ndjson.split('\n').map((line) => JSON.parse(line));
        expect(header).toMatchObject({ type: 'header', verdict: { cause: 'tool_faulty' } });
        expect(messages.length).toBeGreaterThan(0);
        expect(messages.every((message) => message.type === 'message')).toBe(true);
        expect(captured.events).toHaveLength(1);
        expect(captured.events[0].event).toBe(STRUGGLE_EVENT);
        expect(captured.events[0].attributes).toMatchObject({
          model: 'dxn:com.anthropic.model.claude-sonnet-5.default',
          code_mode: true,
          cause: 'tool_faulty',
          cause_group: 'tooling',
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
        yield* runTurn();
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
        yield* runTurn();
        expect(captured).toEqual({ events: [], uploads: [] });
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
