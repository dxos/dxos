//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { mkdtempSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from 'vitest';

import { type AgentProcessDefinition } from '@dxos/agent-runtime';
import { AssistantTestLayer, waitForMessage } from '@dxos/agent-runtime/testing';
import * as Chat from '@dxos/assistant/Chat';
import * as NodeSubprocess from '@dxos/compute-runtime/node-subprocess';
import * as ComputeAgentService from '@dxos/compute/AgentService';
import { Database, Feed, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import * as AcpAgent from '@dxos/plugin-code/AcpAgent';
import { Message } from '@dxos/types';

import { CLAUDE_CODE_AGENT } from '../constants.ts';
import * as ClaudeCodeProcess from './ClaudeCodeProcess.ts';

const FAKE_AGENT = fileURLToPath(new URL('./testing/fake-claude-code-subprocess.ts', import.meta.url));

/** Set per test: the definition needs sessions made in the test's own scope. */
let definition: AgentProcessDefinition | undefined;

const TestLayer = AssistantTestLayer({
  types: [Feed.Feed],
  agent: { processes: () => (definition ? [definition] : []) },
  extraServices: NodeSubprocess.layer,
});

const setup = (command: ClaudeCodeProcess.Command, env?: Record<string, string>) =>
  Effect.gen(function* () {
    const workspace = realpathSync(mkdtempSync(join(tmpdir(), 'claude-code-process-')));
    definition = ClaudeCodeProcess.ClaudeCodeProcess({
      id: CLAUDE_CODE_AGENT,
      sessions: yield* AcpAgent.Sessions.make(),
      workspace: () => Effect.succeed(workspace),
      command: { ...command, env: { ...command.env, ...env } },
    });
    const feed = yield* Database.add(Feed.make());
    const chat = yield* Database.add(
      Chat.make({ feed: Ref.make(feed), session: { process: ClaudeCodeProcess.CLAUDE_CODE_PROCESS_KEY } }),
    );
    return { chat, workspace };
  });

/** The assistant's text in the order the turns produced it. */
const replies = (feed: Feed.Feed, count: number) =>
  Effect.gen(function* () {
    const texts: string[] = [];
    for (let index = 0; index < count; index++) {
      const reply = yield* waitForMessage(
        feed,
        (message) =>
          message.sender.role === 'assistant' &&
          Message.extractText(message).length > 0 &&
          !texts.includes(Message.extractText(message)),
        { timeout: 120_000 },
      );
      texts.push(Message.extractText(reply));
    }
    return texts;
  });

describe('ClaudeCodeProcess', () => {
  it.effect(
    'runs each prompt as a turn of the agent it started in the workspace, kept running between turns',
    Effect.fnUntraced(
      function* (_) {
        const { chat, workspace } = yield* setup({ command: process.execPath, args: [FAKE_AGENT] });
        const session = yield* ComputeAgentService.getSession(chat);
        yield* session.submitPrompt('first');
        const [first] = yield* replies(session.feed, 1);
        yield* session.submitPrompt('second');
        const [, second] = yield* replies(session.feed, 2);

        expect(first).toMatch(new RegExp(`^first pid=\\d+ cwd=${workspace}$`));
        expect(second).toMatch(/^second pid=\d+/);
        // One agent served both turns: the follow-up did not start it again.
        expect(second.match(/pid=(\d+)/)?.[1]).toBe(first.match(/pid=(\d+)/)?.[1]);
        // Recorded on the chat, so a later process continues the same agent session.
        expect(Obj.getKeys(chat, AcpAgent.sessionKeySource(CLAUDE_CODE_AGENT)).map(({ id }) => id)).toEqual(['fake-1']);
      },
      Effect.scoped,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );

  it.effect(
    'fails the turn when the agent cannot be started',
    Effect.fnUntraced(
      function* (_) {
        const { chat } = yield* setup({ command: 'no-such-claude-code-anywhere' });
        const session = yield* ComputeAgentService.getSession(chat);
        yield* session.submitPrompt('hello');
        const exit = yield* session.waitForCompletion().pipe(Effect.exit);
        expect(exit._tag).toBe('Failure');
      },
      Effect.scoped,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );

  // Real Claude Code through its ACP adapter, against the Anthropic API: opt in with `DX_E2E_CLAUDE=1`
  // and `DX_ANTHROPIC_API_KEY`, with `npx` able to fetch the adapter.
  it.effect.skipIf(!process.env.DX_E2E_CLAUDE || !process.env.DX_ANTHROPIC_API_KEY)(
    'e2e: runs turns on Claude Code, which remembers the conversation',
    Effect.fnUntraced(
      function* (_) {
        const { chat } = yield* setup(
          { command: 'npx', args: ['-y', '@agentclientprotocol/claude-agent-acp@0.85.0'] },
          { ANTHROPIC_API_KEY: process.env.DX_ANTHROPIC_API_KEY ?? '' },
        );
        const session = yield* ComputeAgentService.getSession(chat);
        yield* session.submitPrompt('Reply with exactly the single word "pong" and nothing else. Do not use tools.');
        const [reply] = yield* replies(session.feed, 1);
        expect(reply.toLowerCase()).toContain('pong');

        yield* session.submitPrompt('Which word did you just reply with? Answer with that word only, in upper case.');
        const [, followUp] = yield* replies(session.feed, 2);
        expect(followUp).toContain('PONG');
      },
      Effect.scoped,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 240_000 },
  );
});
