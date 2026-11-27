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
import { Grant, Permission, Principal, Requirement, Subject } from '@dxos/permission';

import { AssistantTestLayer } from '../testing/index.ts';
import * as AgentService from './AgentService.ts';

const { text, toolCall, scriptedAiService } = ScriptedLanguageModel;

EntityId.dangerouslyDisableRandomness();

/** Declares a requirement, so only a process whose guard admits it runs it. */
/** Running a command in the sandbox. */
const SandboxExec = Permission.define({ command: '/sandbox/exec', name: 'Run sandbox commands' });

const Exec = Operation.make({
  meta: {
    key: DXN.make('com.example.operation.guardedExec'),
    name: 'Exec',
    description: 'Runs a command.',
  },
  input: Schema.Struct({ command: Schema.String }),
  output: Schema.String,
}).pipe(Operation.requires(Requirement.make(SandboxExec)));

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

const agent = Principal.process('process://local/agent');

/** The session's authority, holding exactly these permissions. */
const authorityFor = Effect.fnUntraced(function* (...permissions: Permission.Definition[]) {
  const grants = yield* Effect.forEach(permissions, ({ command }) =>
    Grant.make({
      issuer: Principal.identity('did:halo:ALICE'),
      audience: agent,
      permissions: [Permission.make({ subject: Subject.any(), command })],
    }),
  );
  return { principal: agent, grants } satisfies Process.Authority;
});

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

describe('AgentService authority', () => {
  const admitted = makeTestLayer();
  it.effect(
    'runs a tool that declares requirements when the session authority holds a covering grant',
    Effect.fnUntraced(
      function* (_) {
        ran.length = 0;
        const authority = yield* authorityFor(SandboxExec);
        const session = yield* AgentService.createSession({ skills: [ExecSkill], authority });
        yield* session.submitPrompt('Run ls.');
        yield* session.waitForCompletion();
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
    'refuses it when the session authority does not cover it, and the model sees the refusal',
    Effect.fnUntraced(
      function* (_) {
        ran.length = 0;
        const authority = yield* authorityFor();
        const session = yield* AgentService.createSession({ skills: [ExecSkill], authority });
        yield* session.submitPrompt('Run ls.');
        yield* session.waitForCompletion();
        expect(ran).toEqual([]);
        expect(refused.prompts.at(-1)).toContain('no grant covers');
      },
      Effect.provide(refused.layer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 15_000 },
  );

  const unguarded = makeTestLayer();
  it.effect(
    'refuses it in a session with no authority',
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
