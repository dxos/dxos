//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, beforeAll, describe, test, vi } from 'vitest';

import { Chat } from '@dxos/assistant';
import * as Trace from '@dxos/compute/Trace';
import { Database, Feed, Filter, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as AcpAgent from '@dxos/plugin-claude/AcpAgent';
import * as HelperClient from '@dxos/plugin-claude/HelperClient';
import { Message } from '@dxos/types';

import { Shell } from '#shell';

import { requestEndpoint } from '../capabilities/agent-host.ts';
import { type AgentHost, startAgentHost } from './testing.ts';

//
// Claude Code under `vite dev`, end to end: the dev shell's agent-host route with its defaults (plugin-claude's
// bundled agent from `moon run plugin-claude:compile-agent`, launched with bun), the page's `HelperClient`, and
// one turn of the real `claude` CLI. Opt-in like plugin-claude's `claude-code.e2e.test.ts`: `DX_E2E_CLAUDE=1`,
// `claude` and `bun` on the path, and `DX_CLAUDE_CODE_OAUTH_TOKEN` or `DX_ANTHROPIC_API_KEY`.
//

const ENABLED = process.env.DX_E2E_CLAUDE === '1';
const OAUTH_TOKEN = process.env.DX_CLAUDE_CODE_OAUTH_TOKEN;
const API_KEY = process.env.DX_ANTHROPIC_API_KEY;
const MODEL = process.env.DX_E2E_CLAUDE_MODEL ?? 'claude-haiku-4-5-20251001';
const TURN_TIMEOUT = 4 * 60_000;

const TestLayer = Layer.mergeAll(
  TestDatabaseLayer({ types: [Feed.Feed, Message.Message, Chat.Chat] }),
  Layer.succeed(Trace.TraceService, { write: () => {} }),
);

describe.runIf(ENABLED && (OAUTH_TOKEN || API_KEY))('dev shell agent host with Claude Code, end to end', () => {
  let root: string;
  let work: string;
  let host: AgentHost;

  beforeAll(async () => {
    root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'dx-dev-shell-claude-')));
    work = path.join(root, 'work');
    fs.mkdirSync(work);
    execFileSync('git', ['init', '-q'], { cwd: work });
    // The agent server inherits the dev server's environment, so the credential reaches `claude` from here; stubbed so
    // the worker's environment is restored for the files that run after this one.
    Object.entries({
      // Claude Code prefers a key to a token, so only one is set.
      ...(OAUTH_TOKEN ? { CLAUDE_CODE_OAUTH_TOKEN: OAUTH_TOKEN } : { ANTHROPIC_API_KEY: API_KEY }),
      ANTHROPIC_MODEL: MODEL,
      CLAUDE_CONFIG_DIR: path.join(root, 'claude'),
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
    }).forEach(([key, value]) => vi.stubEnv(key, value));
    host = await startAgentHost({ worktrees: path.join(root, 'worktrees'), folder: work });
  });

  afterAll(async () => {
    await host?.close();
    vi.unstubAllEnvs();
    // Retried: Claude Code's own processes may still be writing their config as they wind down.
    fs.rmSync(root, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
  });

  test(
    'runs a Claude Code turn from the page through the dev server',
    async ({ expect }) => {
      const client = HelperClient.make(() => requestEndpoint(`${host.origin}${Shell.AGENT_HOST_PATH}`));
      const [status] = await EffectEx.runPromise(client.helper.agents);
      expect(status).toMatchObject({ id: 'claude-code', available: true });

      const replied = await EffectEx.runPromise(
        Effect.gen(function* () {
          const feed = yield* Database.add(Feed.make());
          const chat = yield* Database.add(Chat.make({ feed: Ref.make(feed), session: { harness: 'claude-code' } }));
          const sessions = yield* AcpAgent.Sessions.make();
          yield* AcpAgent.runTurn(
            {
              id: 'claude-code',
              sessions,
              mode: () => 'acceptEdits',
              connect: (cwd, toolsToken) => client.helper.connect('claude-code', cwd, toolsToken),
              workspace: () => client.helper.defaultFolder.pipe(Effect.map((folder) => folder ?? work)),
            },
            { chat, feed },
            { prompt: 'Create a file named hello.txt containing exactly: hello from vite dev. Then reply DONE.' },
          );
          const messages = yield* Feed.query(feed, Filter.type(Message.Message)).run;
          return messages.some((message) => message.sender.role === 'assistant');
        }).pipe(Effect.scoped, Effect.provide(TestLayer)),
      );

      expect(replied).toBe(true);
      expect(fs.readFileSync(path.join(work, 'hello.txt'), 'utf8').trim()).toBe('hello from vite dev');
    },
    TURN_TIMEOUT,
  );
});
