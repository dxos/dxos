//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { expect } from 'vitest';

import { ScriptedLanguageModel } from '@dxos/ai/testing';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import type * as Process from '@dxos/compute/Process';
import * as Skill from '@dxos/compute/Skill';
import { TestHelpers } from '@dxos/effect/testing';
import { DXN, EntityId } from '@dxos/keys';

import { AssistantTestLayer } from '../testing/index.ts';
import * as AgentService from './AgentService.ts';

const { text, toolCall, scriptedAiService } = ScriptedLanguageModel;

EntityId.dangerouslyDisableRandomness();

/** Declares a requirement, so only a process whose guard admits it runs it. */
const Exec = Operation.make({
  meta: {
    key: DXN.make('com.example.operation.guardedExec'),
    name: 'Exec',
    description: 'Runs a command.',
  },
  input: Schema.Struct({ command: Schema.String }),
  output: Schema.String,
}).pipe(Operation.annotate(Operation.RequiresAnnotation, ['/sandbox/exec']));

const ran: string[] = [];

const handlers = OperationHandlerSet.make(
  Exec.pipe(
    Operation.withHandler(({ command }) =>
      Effect.sync(() => {
        ran.push(command);
        return `ran ${command}`;
      }),
    ),
  ),
);

const ExecSkill = Skill.make({
  key: 'org.dxos.skill.guardedExec',
  name: 'Exec',
  tools: Skill.toolDefinitions({ operations: [Exec] }),
});

/** Admits or refuses every operation, recording the keys it was asked about. */
const makeGuard = (admit: boolean) => {
  const checked: string[] = [];
  const guard: Process.Guard = {
    check: (op) =>
      Effect.suspend(() => {
        checked.push(op.meta.key);
        return admit
          ? Effect.void
          : Effect.die(new Operation.OperationDeniedError({ message: 'denied by the test guard', context: {} }));
      }),
  };
  return { guard, checked };
};

/** One tool call, then a reply; the recorded prompts carry the tool result the model was shown. */
const makeTestLayer = () => {
  const prompts: string[] = [];
  return {
    prompts,
    layer: AssistantTestLayer({
      operationHandlers: [handlers],
      skills: [ExecSkill],
      aiService: scriptedAiService([
        {
          name: 'agent',
          match: (request) => {
            prompts.push(JSON.stringify(request.prompt.content));
            return true;
          },
          turns: [{ parts: [toolCall(Operation.toolName(Exec), { command: 'ls' })] }, { parts: [text('Done.')] }],
        },
      ]),
    }),
  };
};

describe('AgentService guard', () => {
  const admitted = makeTestLayer();
  it.effect(
    'runs a tool that declares requirements when the session guard admits it',
    Effect.fnUntraced(
      function* (_) {
        ran.length = 0;
        const { guard, checked } = makeGuard(true);
        const session = yield* AgentService.createSession({ skills: [ExecSkill], guard });
        yield* session.submitPrompt('Run ls.');
        yield* session.waitForCompletion();
        expect(checked).toEqual([Exec.meta.key]);
        expect(ran).toEqual(['ls']);
        expect(admitted.prompts.at(-1)).toContain('ran ls');
      },
      Effect.provide(admitted.layer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 15_000 },
  );

  const refused = makeTestLayer();
  it.effect(
    'refuses it when the session guard does not, and the model sees the refusal',
    Effect.fnUntraced(
      function* (_) {
        ran.length = 0;
        const { guard, checked } = makeGuard(false);
        const session = yield* AgentService.createSession({ skills: [ExecSkill], guard });
        yield* session.submitPrompt('Run ls.');
        yield* session.waitForCompletion();
        expect(checked).toEqual([Exec.meta.key]);
        expect(ran).toEqual([]);
        expect(refused.prompts.at(-1)).toContain('denied by the test guard');
      },
      Effect.provide(refused.layer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 15_000 },
  );

  const unguarded = makeTestLayer();
  it.effect(
    'refuses it in a session with no guard',
    Effect.fnUntraced(
      function* (_) {
        ran.length = 0;
        const session = yield* AgentService.createSession({ skills: [ExecSkill] });
        yield* session.submitPrompt('Run ls.');
        yield* session.waitForCompletion();
        expect(ran).toEqual([]);
        expect(unguarded.prompts.at(-1)).toContain('holds none');
      },
      Effect.provide(unguarded.layer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 15_000 },
  );
});
