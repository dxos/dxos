//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { vi } from 'vitest';

import { ScriptedLanguageModel } from '@dxos/ai/testing';
import { AiContext } from '@dxos/assistant';
import * as Hook from '@dxos/compute/Hook';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { Database, Feed, Filter, Query, Type } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { DXN, EntityId } from '@dxos/keys';

import { AssistantTestLayer } from '../testing/index.ts';
import * as AgentService from './AgentService.ts';

EntityId.dangerouslyDisableRandomness();

const Reply = Operation.make({
  meta: { key: DXN.make('com.example.operation.reply'), name: 'Reply' },
  input: Schema.Struct({ text: Schema.String }),
  output: Schema.Void,
});

const ReplySent = Operation.make({
  meta: { key: DXN.make('com.example.operation.replySent'), name: 'Reply sent' },
  input: Schema.Struct({}),
  output: Schema.Void,
});

const INSTRUCTIONS = 'Answer only through the reply tool.';

const ChannelSkill = Skill.make({
  key: 'com.example.skill.channel',
  name: 'Channel',
  instructions: Template.make({ source: INSTRUCTIONS }),
  tools: Skill.toolDefinitions({ operations: [Reply] }),
});

/** End-request hooks that ran, in order. */
let hookRuns: string[] = [];

const handlers = OperationHandlerSet.make(
  Reply.pipe(Operation.withHandler(() => Effect.void)),
  ReplySent.pipe(Operation.withHandler(() => Effect.sync(() => void hookRuns.push('reply-sent')))),
);

const HOOKS = Hook.forPlugin('com.example.plugin.channel', [
  { key: 'com.example.hook.replySent', event: 'end-request', skill: Skill.getKey(ChannelSkill), operation: ReplySent },
]);

/** Requests the model saw, in call order. */
let requests: ScriptedLanguageModel.ScriptedRequest[] = [];

const TestLayer = AssistantTestLayer({
  operationHandlers: handlers,
  types: [Skill.Skill, Feed.Feed],
  skills: [ChannelSkill],
  aiService: ScriptedLanguageModel.scriptedAiService((request) => {
    requests.push(request);
    return { parts: [ScriptedLanguageModel.text('Done.')] };
  }),
  agent: { hooks: () => HOOKS },
});

const BINDING_TYPENAME = Type.getTypename(AiContext.Binding);

/** Whether a query result reads a conversation's bindings (the binder's feed walk). */
const readsBindings = (result: unknown): boolean =>
  typeof result === 'object' &&
  result !== null &&
  'query' in result &&
  Query.is(result.query) &&
  JSON.stringify(result.query.ast).includes(BINDING_TYPENAME);

/**
 * Serves every conversation's binding reads as EDGE's index does before it has indexed a binding another worker
 * wrote: a read returns none, and a live query opened meanwhile never hears of them, because EDGE's query host
 * answers a query once. `catchUp` lets later reads see the feed.
 */
const lagBindingIndex = Effect.fnUntraced(function* () {
  const { db } = yield* Database.Service;
  const prototype = Object.getPrototypeOf(db.query(Filter.everything()));
  const run = prototype.run;
  const subscribe = prototype.subscribe;
  const index = { caughtUp: false, staleReads: 0 };
  vi.spyOn(prototype, 'run').mockImplementation(function (this: unknown, ...args: unknown[]) {
    if (!index.caughtUp && readsBindings(this)) {
      index.staleReads++;
      return Promise.resolve([]);
    }
    return run.apply(this, args);
  });
  vi.spyOn(prototype, 'subscribe').mockImplementation(function (this: unknown, ...args: unknown[]) {
    return !index.caughtUp && readsBindings(this) ? () => {} : subscribe.apply(this, args);
  });
  return index;
});

describe('first request on a new chat', () => {
  beforeEach(() => {
    hookRuns = [];
    requests = [];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.effect(
    'sees skills bound before the prompt, though the session opened before the index had them',
    Effect.fnUntraced(
      function* (_) {
        const index = yield* lagBindingIndex();
        // Binds the skill, then spawns the agent, whose session opens against the lagging index.
        const session = yield* AgentService.createSession({ skills: [ChannelSkill] });
        expect(index.staleReads).toBeGreaterThan(0);

        // The index has the binding by the time the prompt lands: it indexes a feed in position order, and the
        // binding was appended first.
        index.caughtUp = true;
        yield* session.submitPrompt('Hello.');
        yield* session.waitForCompletion();

        const [first] = requests;
        expect(first?.tools).toContain(Operation.toolName(Reply));
        expect(first?.system).toContain(INSTRUCTIONS);
        expect(hookRuns).toEqual(['reply-sent']);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
