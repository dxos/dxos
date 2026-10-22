//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';
import * as AtomRegistry from 'effect/reactivity/AtomRegistry';
import * as Schema from 'effect/Schema';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { ScriptedLanguageModel } from '@dxos/ai/testing';
import { AiSession } from '@dxos/assistant';
import * as Chat from '@dxos/assistant/Chat';
import * as AgentService from '@dxos/compute/AgentService';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Skill from '@dxos/compute/Skill';
import { Database, Feed, Ref } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { TestHelpers } from '@dxos/effect/testing';
import { DXN } from '@dxos/keys';
import { Message } from '@dxos/types';

import { ChatModel } from './chat-model.ts';
import { ChatModelRecorder } from './testing/chat-model-recorder.ts';
import { makeSpaceLayer, makeTestRuntime } from './testing/harness.ts';

const { text, toolCall, scriptedAiService } = ScriptedLanguageModel;

/**
 * Light threads as the chat shows them, end to end: the real agent process with parallel threads on, a scripted model,
 * and the rows the chat renders recorded after every change. A lane a newer request sends to the background must be
 * one card in its original place for the rest of its life, and its answer must land where it completes; asserting on
 * the whole log, not the end state, is what catches a lane flipping back inline or interleaving for a moment.
 */

//
// Gate: holds the research turn open, so the next prompts arrive while it runs.
//

const Gate = Operation.make({
  meta: {
    key: DXN.make('com.example.operation.lanesGate'),
    name: 'Gate',
    description: 'Runs until the test releases it.',
  },
  input: Schema.Struct({ label: Schema.String.annotate({ description: 'Label echoed back' }) }),
  output: Schema.String,
});

let gate: { started: Deferred.Deferred<void>; release: Deferred.Deferred<void> } | undefined;

const makeGate = Effect.gen(function* () {
  const next = { started: yield* Deferred.make<void>(), release: yield* Deferred.make<void>() };
  gate = next;
  return next;
});

const GateHandlers = OperationHandlerSet.make(
  Gate.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ label }) {
        const current = gate;
        if (!current) {
          return yield* Effect.die(new Error('Gate not installed.'));
        }
        yield* Deferred.succeed(current.started, undefined);
        yield* Deferred.await(current.release);
        return `${label}: released`;
      }),
    ),
  ),
);

const GateSkill = Skill.make({
  key: 'org.dxos.skill.lanesGate',
  name: 'Gate',
  tools: Skill.toolDefinitions({ operations: [Gate] }),
});

const GATE = Operation.toolName(Gate);

/** The text of the request a call answers: the last text part of the last user message. */
const requestOf = ({ prompt }: ScriptedLanguageModel.ScriptedRequest): string => {
  const user = prompt.content.findLast((message) => message.role === 'user');
  if (!user) {
    return '';
  }
  const parts =
    typeof user.content === 'string'
      ? [user.content]
      : user.content.flatMap((part) => (part.type === 'text' ? [part.text] : []));
  return parts.filter((part) => !part.includes('<thread ') && !/^Thread \S+ .* is /.test(part)).at(-1) ?? '';
};

const afterTool = ({ prompt }: ScriptedLanguageModel.ScriptedRequest) => prompt.content.at(-1)?.role === 'tool';

/**
 * Research parks in the gate and then summarises; a quick question answers at once; a dependent request waits for the
 * research thread, then answers from it.
 */
const script: ScriptedLanguageModel.ScriptedTurnGenerator = (request) => {
  const current = requestOf(request);
  if (current.startsWith('Research')) {
    return { parts: [afterTool(request) ? text('The sea is wide.') : toolCall(GATE, { label: 'research' })] };
  }
  if (current.startsWith('Quick')) {
    return { parts: [text('391.')] };
  }
  if (current.startsWith('Translate')) {
    if (!afterTool(request)) {
      const research = /<thread id="([^"]+)" title="Research/.exec(request.text)?.[1];
      return { parts: [toolCall('thread_wait', { thread: research })] };
    }
    return { parts: [text('La mer est vaste.')] };
  }
  return { parts: [text('?')] };
};

const testLayer = () =>
  AssistantTestLayer({
    types: [Chat.Chat, Feed.Feed, Message.Message],
    operationHandlers: [GateHandlers],
    skills: [GateSkill],
    agent: { threading: () => ({ limit: 3 }) },
    aiService: scriptedAiService(script),
  });

/** A chat model over the test layer's agent service with the gate bound, and a recorder attached before anything runs. */
const setup = Effect.fn(function* () {
  const feed = yield* Database.add(Feed.make());
  const chat = yield* Database.add(Chat.make({ name: 'Test', feed: Ref.make(feed) }));
  const runtime = yield* Effect.context<Database.Service>();
  const session = yield* EffectEx.acquireReleaseResource(() => new AiSession.Session({ feed, runtime }));
  yield* Effect.promise(() => session.context.bind({ skills: [Skill.makeRef(GateSkill)], objects: [] }));
  const registry = yield* AtomRegistry.AtomRegistry;
  const chatModel = new ChatModel(session, yield* makeTestRuntime, feed, yield* makeSpaceLayer, {
    chat: Ref.make(chat),
    observableRegistry: registry,
  });
  const agent = yield* AgentService.getSession(chat, { location: 'local' });
  const recorder = new ChatModelRecorder(registry, chatModel, { agentRunning: agent.running });
  yield* Effect.addFinalizer(() => Effect.sync(() => recorder.dispose()));
  return { chatModel, recorder };
});

const until = (recorder: ChatModelRecorder, predicate: (thread: string) => boolean) =>
  Effect.promise(() => recorder.until((state) => predicate(state.thread)));

/** Every thread the chat showed, in order. */
const threads = (recorder: ChatModelRecorder) => recorder.values('thread');

describe('ChatModel light threads (scripted agent)', { timeout: 30_000 }, () => {
  it.live(
    'a lane sent to the background stays one card in its place, and its answer lands where it completes',
    Effect.fn(
      function* ({ expect }) {
        const { chatModel, recorder } = yield* setup();
        const { started, release } = yield* makeGate;
        chatModel.send({ message: 'Research the sea.' });
        yield* Deferred.await(started);

        // The quick question runs beside the research, which goes to the background as a card where it began.
        chatModel.send({ message: 'Quick: what is 17 × 23?' });
        yield* until(recorder, (thread) => thread.includes('assistant<Quick:>:"391."'));
        expect(recorder.state.thread).toBe(
          'card<Research:running> | user[read]<Quick:>:"Quick: what is 17 × 23?" | assistant<Quick:>:"391."',
        );

        // The quick lane has ended and the research is the only lane running, yet it stays a card.
        yield* until(recorder, () => true);
        expect(recorder.state.thread.startsWith('card<Research:running>')).toBe(true);

        // The research finishes: its card stays where it began, and its answer lands after what came meanwhile.
        yield* Deferred.succeed(release, undefined);
        yield* Effect.promise(() => recorder.untilSettled());
        yield* until(recorder, (thread) => thread.includes('assistant<Research'));
        expect(recorder.state.thread).toBe(
          [
            'card<Research:done>',
            'user[read]<Quick:>:"Quick: what is 17 × 23?"',
            'assistant<Quick:>:"391."',
            'assistant<Research>:"The sea is wide."',
          ].join(' | '),
        );

        // Once in the background, the research never showed a row of its own until its answer: no interleaving,
        // and no switching back inline.
        const sinceCard = threads(recorder).slice(threads(recorder).findIndex((thread) => thread.startsWith('card<')));
        for (const thread of sinceCard) {
          expect(thread.startsWith('card<Research:')).toBe(true);
          expect(thread.replace(/assistant<Research>:"The sea is wide\."/, '')).not.toMatch(/<Research>/);
        }
        expect(recorder.violations).toEqual([]);
      },
      Effect.provide(testLayer()),
      TestHelpers.provideTestContext,
    ),
  );

  it.live(
    'a lane that waits for the background lane answers after the background answer lands',
    Effect.fn(
      function* ({ expect }) {
        const { chatModel, recorder } = yield* setup();
        const { started, release } = yield* makeGate;
        chatModel.send({ message: 'Research the sea.' });
        yield* Deferred.await(started);

        chatModel.send({ message: 'Translate the research into French.' });
        yield* until(recorder, (thread) => thread.includes('call(thread_wait)'));
        expect(recorder.state.thread.startsWith('card<Research:running>')).toBe(true);

        yield* Deferred.succeed(release, undefined);
        yield* until(recorder, (thread) => thread.includes('"La mer est vaste."'));
        yield* Effect.promise(() => recorder.untilSettled());
        const rows = recorder.state.thread.split(' | ');
        expect(rows[0]).toBe('card<Research:done>');
        // The research answer lands at its completion, before the answer that waited for it.
        expect(rows.findIndex((row) => row.includes('The sea is wide.'))).toBeLessThan(
          rows.findIndex((row) => row.includes('La mer est vaste.')),
        );
        expect(rows.filter((row) => row.includes('<Research>'))).toEqual(['assistant<Research>:"The sea is wide."']);
      },
      Effect.provide(testLayer()),
      TestHelpers.provideTestContext,
    ),
  );
});
