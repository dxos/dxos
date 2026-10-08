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
import * as NodeShell from '@dxos/compute-runtime/node-shell';
import * as AgentService from '@dxos/compute/AgentService';
import { Database, Feed, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { AccessToken } from '@dxos/link';
import * as AcpAgent from '@dxos/plugin-code/AcpAgent';
import { Message } from '@dxos/types';

import { CLAUDE_CODE_AGENT, CLAUDE_CODE_TOKEN_SOURCE } from '../constants.ts';
import * as ClaudeCodeProcess from './ClaudeCodeProcess.ts';

const FAKE_AGENT = fileURLToPath(new URL('./testing/fake-claude-code-subprocess.ts', import.meta.url));

/** Set per test: the definition needs sessions made in the test's own scope. */
let definition: AgentProcessDefinition | undefined;

const TestLayer = AssistantTestLayer({
  types: [Feed.Feed, AccessToken.AccessToken],
  agent: { processes: () => (definition ? [definition] : []) },
  extraServices: NodeShell.layer,
});

const setup = Effect.fnUntraced(function* (command: ClaudeCodeProcess.Command, env?: Record<string, string>) {
  const workspace = realpathSync(mkdtempSync(join(tmpdir(), 'claude-code-process-')));
  definition = ClaudeCodeProcess.make({
    id: CLAUDE_CODE_AGENT,
    sessions: yield* AcpAgent.Sessions.make(),
    workspace: () => Effect.succeed(workspace),
    command: { ...command, env: { ...command.env, ...env } },
  });
  const feed = yield* Database.add(Feed.make());
  const chat = yield* Database.add(Chat.make({ feed: Ref.make(feed), session: { process: ClaudeCodeProcess.KEY } }));
  return { chat, workspace };
});

/** The assistant's text in the order the turns produced it. */
const replies = Effect.fnUntraced(function* (feed: Feed.Feed, count: number) {
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
        const session = yield* AgentService.getSession(chat);
        yield* session.submitPrompt('first');
        const [first] = yield* replies(session.feed, 1);
        yield* session.submitPrompt('second');
        const [, second] = yield* replies(session.feed, 2);

        expect(first).toMatch(/^first pid=\d+ /);
        // No subscription token is connected, so the agent gets none.
        expect(first).toContain(' oauth=none ');
        expect(first.endsWith(` cwd=${workspace}`)).toBe(true);
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
    'runs the agent on the Claude subscription token connected in the space',
    Effect.fnUntraced(
      function* (_) {
        yield* Database.add(
          Obj.make(AccessToken.AccessToken, { source: CLAUDE_CODE_TOKEN_SOURCE, token: 'sk-ant-oat01-test' }),
        );
        const { chat } = yield* setup({ command: process.execPath, args: [FAKE_AGENT] });
        const session = yield* AgentService.getSession(chat);
        yield* session.submitPrompt('hello');
        const [reply] = yield* replies(session.feed, 1);
        expect(reply).toContain(' oauth=sk-ant-oat01-test ');
      },
      Effect.scoped,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );

  it.effect(
    'starts a new agent once the last one died, though something it started still holds its output',
    Effect.fnUntraced(
      function* (_) {
        const { chat } = yield* setup(
          { command: process.execPath, args: [FAKE_AGENT] },
          { FAKE_AGENT_HOLD_STDOUT: '1' },
        );
        const session = yield* AgentService.getSession(chat);
        yield* session.submitPrompt('first');
        const [first] = yield* replies(session.feed, 1);
        const pid = Number(first.match(/ pid=(\d+)/)?.[1]);
        const holder = Number(first.match(/ holder=(\d+)/)?.[1]);
        yield* Effect.addFinalizer(() => Effect.sync(() => process.kill(holder, 'SIGKILL')));
        process.kill(pid, 'SIGKILL');

        yield* session.submitPrompt('second');
        const [, second] = yield* replies(session.feed, 2);
        expect(second).toMatch(/^second pid=\d+/);
        expect(Number(second.match(/ pid=(\d+)/)?.[1])).not.toBe(pid);
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
        const session = yield* AgentService.getSession(chat);
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
});
