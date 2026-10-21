//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { type ChildProcessWithoutNullStreams, execFileSync, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

import { Chat } from '@dxos/assistant';
import * as Trace from '@dxos/compute/Trace';
import { Database, Feed, Filter, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Message } from '@dxos/types';

import * as AcpAgent from '../agents/AcpAgent.ts';
import * as HelperClient from '../agents/HelperClient.ts';

//
// The desktop app's coding-agent path without Tauri: the compiled `dx-agent` sidecar
// (`moon run plugin-claude:compile-agent-helper`) serving the bundled Claude Code agent
// (`moon run plugin-claude:compile-agent`), reached by the page's `HelperClient`, running one turn of
// the real `claude` CLI. Opt-in like `claude-code.e2e.test.ts`: `DX_E2E_CLAUDE=1`, `claude` on the path,
// and `DX_CLAUDE_CODE_OAUTH_TOKEN` or `DX_ANTHROPIC_API_KEY`.
//

const ENABLED = process.env.DX_E2E_CLAUDE === '1';
const OAUTH_TOKEN = process.env.DX_CLAUDE_CODE_OAUTH_TOKEN;
const API_KEY = process.env.DX_ANTHROPIC_API_KEY;
const MODEL = process.env.DX_E2E_CLAUDE_MODEL ?? 'claude-haiku-4-5-20251001';
const TURN_TIMEOUT = 4 * 60_000;

const DIST = fileURLToPath(new URL('../../dist', import.meta.url));
const SIDECAR = join(DIST, 'sidecar', 'dx-agent');
const AGENTS = join(DIST, 'agent');

const TestLayer = Layer.mergeAll(
  TestDatabaseLayer({ types: [Feed.Feed, Message.Message, Chat.Chat] }),
  Layer.succeed(Trace.TraceService, { write: () => {} }),
);

/** Starts the sidecar as the Tauri launcher does: the token on its first input line, the port on its first output line. */
const startSidecar = (env: NodeJS.ProcessEnv) =>
  Effect.acquireRelease(
    Effect.promise(
      () =>
        new Promise<{ child: ChildProcessWithoutNullStreams; endpoint: HelperClient.Endpoint }>((resolve, reject) => {
          const token = randomBytes(32).toString('hex');
          const child = spawn(SIDECAR, [], { env, stdio: ['pipe', 'pipe', 'pipe'] });
          child.on('error', reject);
          // Kept for the error: a sidecar that dies before reporting a port explains why only on stderr.
          let stderr = '';
          child.stderr.on('data', (chunk) => (stderr += chunk));
          child.on('exit', (code) =>
            reject(new Error(`dx-agent exited with ${code} before reporting a port: ${stderr.trim()}`)),
          );
          createInterface({ input: child.stdout }).once('line', (line) => {
            const { port } = JSON.parse(line);
            resolve({ child, endpoint: { port, token } });
          });
          child.stdin.write(`${token}\n`);
        }),
    ),
    ({ child }) =>
      Effect.promise(
        () =>
          new Promise<void>((resolve) => {
            child.once('exit', () => resolve());
            child.stdin.end();
          }),
      ),
  );

describe.runIf(ENABLED && (OAUTH_TOKEN || API_KEY) && existsSync(SIDECAR) && existsSync(AGENTS))(
  'dx-agent sidecar with Claude Code, end to end',
  () => {
    it.live(
      'runs a turn that writes a file in the chat folder',
      () =>
        Effect.gen(function* () {
          const root = mkdtempSync(join(tmpdir(), 'dx-agent-e2e-'));
          // Retried: Claude Code's own processes may still be writing their config as they wind down after the sidecar exits.
          yield* Effect.addFinalizer(() =>
            Effect.sync(() => rmSync(root, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 })),
          );
          const work = join(root, 'work');
          mkdirSync(work, { recursive: true });
          execFileSync('git', ['init', '-q'], { cwd: work });

          const { endpoint } = yield* startSidecar({
            ...process.env,
            // Claude Code prefers a key to a token, so only one is set.
            ...(OAUTH_TOKEN ? { CLAUDE_CODE_OAUTH_TOKEN: OAUTH_TOKEN } : { ANTHROPIC_API_KEY: API_KEY }),
            ANTHROPIC_MODEL: MODEL,
            CLAUDE_CONFIG_DIR: join(root, 'claude'),
            CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
            DX_AGENT_DIR: AGENTS,
            DX_AGENT_WORKTREES: join(root, 'worktrees'),
          });
          const client = HelperClient.make(async () => endpoint);

          const [status] = yield* client.helper.agents;
          expect(status).toMatchObject({ id: 'claude-code', available: true });

          const feed = yield* Database.add(Feed.make());
          const chat = yield* Database.add(Chat.make({ feed: Ref.make(feed), session: { harness: 'claude-code' } }));
          const sessions = yield* AcpAgent.Sessions.make();
          yield* AcpAgent.runTurn(
            {
              id: 'claude-code',
              sessions,
              mode: () => 'acceptEdits',
              connect: (cwd, toolsToken) => client.helper.connect('claude-code', cwd, toolsToken),
              workspace: () => Effect.succeed(work),
            },
            { chat, feed },
            { prompt: 'Create a file named hello.txt containing exactly: hello from dx-agent. Then reply DONE.' },
          );

          expect(readFileSync(join(work, 'hello.txt'), 'utf8').trim()).toBe('hello from dx-agent');
          const messages = yield* Feed.query(feed, Filter.type(Message.Message)).run;
          expect(messages.some((message) => message.sender.role === 'assistant')).toBe(true);
        }).pipe(Effect.scoped, Effect.provide(TestLayer)),
      TURN_TIMEOUT,
    );
  },
);
