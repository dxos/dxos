//
// Copyright 2026 DXOS.org
//

import { afterAll, beforeAll, describe, test } from '@effect/vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { ClaudeAgent, type Turn } from '@dxos/test-utils/claude-agent';

import { EVENT_FEED_URI, type EventServer, dxBin, makeEventServer } from '../../testing/index.ts';

/**
 * End-to-end: an idle Claude Code agent is woken by an event a 2026-07-28 MCP server publishes.
 *
 * Claude Code has no native path for that — it drops `claude/channel` on a 2026 connection and
 * never shows `notifications/resources/updated` to the model — so the agent arms `dx mcp listen`
 * under its `Monitor` tool, which starts a turn on every line the command prints. The event is
 * published only after the agent has gone idle, so a turn that mentions it can only have been
 * started by the monitor.
 *
 * Tagged `manual`: it spends real tokens and needs a `claude` binary on PATH, so
 * `DX_RUN_MANUAL_TESTS=1` opts in (see `vitest.tags.ts`) and CI never selects it.
 */

/** Same credential and model conventions as `agent-e2e.test.ts`. */
const API_KEY = process.env.DX_ANTHROPIC_API_KEY ?? '';
const MODEL = process.env.DX_E2E_MODEL ?? 'sonnet';

/** Distinctive enough that the model cannot produce it without having read the event. */
const EVENT = 'CI build failed on main: run 7431, packages/echo/query.test.ts timed out';

/** The part of {@link EVENT} a reply can only contain if the agent read the event. */
const EVENT_MARKER = 'run 7431';

/** How long the monitored `dx mcp listen` gets to connect; a cold `dx` start is seconds, not minutes. */
const LISTEN_TIMEOUT = 60_000;

/** A monitor can wake the agent for lines that are not the event; this many turns is plenty to reach it. */
const MAX_WAKES = 3;

/** Must stay below `TEST_TIMEOUT` so the driver's "last events" diagnostic prints first. */
const TURN_TIMEOUT = 240_000;
/** The arming turn and every wake may each take a full turn, plus the listener's start-up. */
const TEST_TIMEOUT = (1 + MAX_WAKES) * TURN_TIMEOUT + 2 * LISTEN_TIMEOUT;

/** Rejects with `diagnose()` when `promise` has not settled within `timeout`, so a stall reports its cause. */
const waitFor = async <T>(promise: Promise<T>, timeout: number, diagnose: () => string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(diagnose())), timeout);
  });
  try {
    return await Promise.race([promise, expired]);
  } finally {
    clearTimeout(timer);
  }
};

describe.skipIf(!API_KEY)('claude code woken by dx mcp listen', { tags: ['manual'] }, () => {
  let home: string;
  let workdir: string;
  let server: EventServer;
  let url: string;
  let agent: ClaudeAgent;

  beforeAll(async () => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'dx-listen-e2e-home-'));
    workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'dx-listen-e2e-cwd-'));
    server = makeEventServer();
    url = await server.serve();

    agent = ClaudeAgent.start({
      cwd: workdir,
      mcpServers: {},
      apiKey: API_KEY,
      model: MODEL,
      // Monitor alone: an agent that could shell out might watch the feed some other way, and the
      // run would prove nothing about the monitor waking it.
      allowedTools: ['Monitor'],
      // Bare mode withholds Monitor; the throwaway HOME keeps the developer's settings out instead.
      bare: false,
      env: {
        HOME: home,
        // The `dx` wrapper finds bun through proto shims, which live under the real HOME.
        PROTO_HOME: process.env.PROTO_HOME ?? path.join(os.homedir(), '.proto'),
      },
      timeout: TURN_TIMEOUT,
    });
  }, 60_000);

  afterAll(async () => {
    await agent?.close();
    await server?.dispose();
    for (const dir of [home, workdir]) {
      if (dir) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  test(
    'an idle agent reacts to a resource update',
    async ({ expect }) => {
      const armed = await agent.send(
        [
          `Use the Monitor tool to run \`${dxBin} mcp listen --url ${url} --resource ${EVENT_FEED_URI}\``,
          '(description "event feed", as long a timeout as it allows).',
          'Each line it prints is one JSON event from an external system.',
          'Whenever one arrives, reply with exactly one line: "EVENT: " followed by the text in its contents.',
          'After starting the monitor, reply WATCHING and nothing else.',
        ].join(' '),
      );
      expect(armed.isError).to.equal(false);
      expect(armed.toolCalls).to.include('Monitor');

      await waitFor(server.listening, LISTEN_TIMEOUT, () => {
        const results = armed.events.filter((event) => event.type === 'user');
        return `dx mcp listen never connected; the arming turn's tool results: ${JSON.stringify(results).slice(0, 2000)}`;
      });
      await server.publish(EVENT);

      // No prompt follows the publish, so a turn quoting the event can only have been started by the monitor.
      let woken: Turn | undefined;
      for (let wake = 0; wake < MAX_WAKES && !woken?.result?.includes(EVENT_MARKER); wake++) {
        woken = await agent.nextTurn();
      }
      expect(woken?.result).to.contain(EVENT_MARKER);
    },
    TEST_TIMEOUT,
  );
});
