//
// Copyright 2026 DXOS.org
//

import { createWebSocketStream } from '@agentclientprotocol/sdk/experimental/ws-client';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { AgentService } from '@dxos/agent-runtime';
import { AssistantTestLayer, makeScriptedTenant } from '@dxos/agent-runtime/testing';
import { Alarm, TrajectoryStore } from '@dxos/assistant';
import { type Database, type Feed } from '@dxos/echo';
import * as RuntimeProvider from '@dxos/effect/RuntimeProvider';
import { TestHelpers } from '@dxos/effect/testing';
import { Reducer } from '@dxos/trajectory';
import { Message } from '@dxos/types';

import { serve } from '../agent-helper/server.ts';
import * as AcpAgent from './AcpAgent.ts';
import * as Protocol from './Protocol.ts';

//
// Two agents in one chat, with Claude Code for real: the default agent is scripted and slow, and a prompt
// addressed `@claude` runs a real Claude Code turn over ACP (the agent helper, Claude Code's ACP adapter and the
// `claude` CLI) in a light thread Claude owns. Runs only where `DX_E2E_CLAUDE=1` is set, with `claude` on the PATH
// and `DX_ANTHROPIC_API_KEY` or `DX_CLAUDE_CODE_OAUTH_TOKEN`. Writes the lanes to `DX_E2E_TRANSCRIPT` when set.
//

const ENABLED = process.env.DX_E2E_CLAUDE === '1';
const OAUTH_TOKEN = process.env.DX_CLAUDE_CODE_OAUTH_TOKEN;
const API_KEY = process.env.DX_ANTHROPIC_API_KEY;
const MODEL = process.env.DX_E2E_CLAUDE_MODEL ?? 'claude-haiku-4-5-20251001';
const TRANSCRIPT = process.env.DX_E2E_TRANSCRIPT;
const TIMEOUT = 5 * 60_000;

/** Version of Claude Code's ACP adapter the desktop app ships (see plugin-claude's `build-agent.ts`). */
const ADAPTER = '@agentclientprotocol/claude-agent-acp@0.85.0';

const which = (name: string): string | undefined => {
  try {
    return execFileSync('which', [name], { encoding: 'utf8' }).trim() || undefined;
  } catch {
    return undefined;
  }
};

const CLAUDE = which('claude');

/** The real adapter, installed once into a temporary cache rather than as a dependency. */
const realAdapter = (): string => {
  const cache = join(tmpdir(), 'dx-claude-agent-acp-0.85.0');
  const entry = join(cache, 'node_modules/@agentclientprotocol/claude-agent-acp/dist/index.js');
  if (!existsSync(entry)) {
    execFileSync('npm', ['install', '--silent', '--no-save', '--omit=optional', '--prefix', cache, ADAPTER], {
      stdio: 'inherit',
    });
  }
  return entry;
};

/** The default agent: slow enough that the prompt to Claude arrives while it still works. */
const planner = makeScriptedTenant({
  name: 'deepseek',
  reply: () => ({ text: 'Plan: 1. read the store, 2. write events, 3. drop the legacy records.', delay: 25_000 }),
});

/** The lanes as lines: owner, kind, status, then each message. */
const describeLanes = (view: Reducer.ThreadView): string =>
  view.lanes
    .map((lane) =>
      [
        `## ${lane.owner.name ?? 'composer'} (${lane.kind}, ${lane.status})${lane.purpose ? ` — ${lane.purpose}` : ''}`,
        ...view.items
          .filter((item) => item.lane === lane.id)
          .map(
            (item) =>
              `- ${item.sender.name ?? item.sender.role}: ${item.blocks
                .map((block) =>
                  block._tag === 'text' ? block.text.trim() : block._tag === 'toolCall' ? `[${block.name}]` : '',
                )
                .filter((value) => value.length > 0)
                .join(' ')}`,
          ),
      ].join('\n'),
    )
    .join('\n\n');

const read = (feed: Feed.Feed) => Effect.map(TrajectoryStore.load(feed, Reducer.thread), ({ state }) => state);

/** Polls the thread view until `done` holds. */
const waitFor = (feed: Feed.Feed, done: (view: Reducer.ThreadView) => boolean) =>
  Effect.gen(function* () {
    const runtime = yield* Effect.context<Database.Service>();
    yield* Effect.promise(async () => {
      await expect
        .poll(() => RuntimeProvider.runPromise(Effect.succeed(runtime))(Effect.map(read(feed), done)), {
          timeout: TIMEOUT,
          interval: 500,
        })
        .toBe(true);
    });
  });

describe.runIf(ENABLED && (OAUTH_TOKEN || API_KEY) && CLAUDE)('Claude Code shares a chat (real ACP)', () => {
  const root = mkdtempSync(join(tmpdir(), 'claude-tenant-e2e-'));
  const work = join(root, 'work');
  const token = 'e2e'.repeat(12);
  let port = 0;

  const claude = AcpAgent.makeTurnProducer;

  it.live(
    'a prompt to @claude runs a real Claude Code turn in its own lane while the default agent works',
    Effect.fnUntraced(
      function* (_) {
        mkdirSync(work, { recursive: true });
        execFileSync('git', ['init', '-q'], { cwd: work });
        writeFileSync(join(work, 'TrajectoryStore.ts'), 'export const fold = () => [];\n');
        writeFileSync(join(work, 'Reducer.ts'), 'export const run = () => undefined;\n');
        Object.assign(process.env, {
          // Claude Code prefers a key to a token, so only one is set.
          ...(OAUTH_TOKEN ? { CLAUDE_CODE_OAUTH_TOKEN: OAUTH_TOKEN } : { ANTHROPIC_API_KEY: API_KEY }),
          ANTHROPIC_MODEL: MODEL,
          CLAUDE_CONFIG_DIR: join(root, 'claude'),
          CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
        });
        const server = yield* Effect.acquireRelease(
          Effect.promise(() =>
            serve({
              token,
              agents: [
                {
                  id: 'claude-code',
                  entry: realAdapter(),
                  executable: { name: 'claude', versionArgs: ['--version'], env: 'CLAUDE_CODE_EXECUTABLE' },
                },
              ],
              path: [dirname(CLAUDE ?? ''), ...(process.env.PATH ?? '').split(':')],
            }),
          ),
          (server) => Effect.promise(() => server.close()),
        );
        port = server.port;

        const session = yield* AgentService.createSession();
        yield* session.submitPrompt('Draft a three-step plan for migrating the chat store to events.');
        yield* waitFor(session.feed, (view) => view.lanes.length === 1);
        yield* session.submitPrompt(
          '@claude List the TypeScript files in the current directory. Reply with only their names, comma-separated.',
        );

        // Claude answers in its own lane while the default agent is still planning.
        yield* waitFor(session.feed, (view) => view.lanes[1]?.status === 'done');
        const during = yield* read(session.feed);
        expect(during.lanes.map((lane) => [lane.kind, lane.owner.name, lane.status])).toEqual([
          ['light', 'deepseek', 'running'],
          ['light', 'claude', 'done'],
        ]);
        const answer = during.items
          .filter((item) => item.lane === during.lanes[1].id && item.sender.role === 'assistant')
          .map((item) => Message.extractText(Message.make({ sender: { role: 'assistant' }, blocks: [...item.blocks] })))
          .join(' ');
        expect(answer).toContain('Reducer.ts');
        expect(answer).toContain('TrajectoryStore.ts');

        yield* session.waitForCompletion();
        const done = yield* read(session.feed);
        expect(done.lanes.map((lane) => lane.status)).toEqual(['done', 'done']);
        // Both lanes merged into main: a later prompt sees Claude's answer and the plan.
        const history = (yield* TrajectoryStore.history(session.feed)).map((message) => Message.extractText(message));
        expect(history.join('\n')).toContain('Plan: 1.');
        expect(history.join('\n')).toContain('Reducer.ts');

        if (TRANSCRIPT) {
          writeFileSync(
            TRANSCRIPT,
            `# Claude Code (real, over ACP) beside a scripted agent\n\n${describeLanes(done)}\n`,
          );
        }
      },
      Effect.scoped,
      Effect.provide(
        AssistantTestLayer({
          types: [Alarm.Alarm],
          agent: {
            makeTurnProducer: planner,
            threading: () => ({
              owner: 'deepseek',
              tenants: [
                {
                  name: 'claude',
                  makeTurnProducer: (context) =>
                    Effect.flatMap(AcpAgent.Sessions.make(), (sessions) =>
                      claude({
                        id: 'claude-code',
                        sessions,
                        connect: (cwd) =>
                          Effect.succeed(
                            createWebSocketStream(Protocol.acpUrl({ port, agent: 'claude-code', cwd }), {
                              protocols: [Protocol.SUBPROTOCOL, Protocol.tokenProtocol(token)],
                            }),
                          ),
                        workspace: () => Effect.succeed(work),
                        mode: () => 'acceptEdits',
                      })(context),
                    ),
                },
              ],
            }),
          },
        }),
      ),
      TestHelpers.provideTestContext,
    ),
    TIMEOUT,
  );
});
