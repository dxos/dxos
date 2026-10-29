//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, beforeAll, describe, test } from 'vitest';

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

/** The fake agent's script, copied into a temporary agents directory as that agent's entry. */
const FAKE_AGENT = new URL('../testing/fake-acp-agent.mjs', import.meta.url);

const TestLayer = Layer.mergeAll(
  TestDatabaseLayer({ types: [Feed.Feed, Message.Message, Chat.Chat] }),
  Layer.succeed(Trace.TraceService, { write: () => {} }),
);

// The page's path to a coding agent under `vite dev`: the dev shell's route starts plugin-claude's agent server, and the
// page's HelperClient drives an ACP session on it over a WebSocket, as `CodeAgent` does for Claude Code.
describe('dev shell agent host', () => {
  let root: string;
  let host: AgentHost;

  beforeAll(async () => {
    root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'dx-dev-shell-agent-')));
    const agentDir = path.join(root, 'agents', 'claude-code');
    fs.mkdirSync(agentDir, { recursive: true });
    // No `executable`: the fake agent needs no local tool, so the server reports it available.
    fs.writeFileSync(path.join(agentDir, 'agent.json'), JSON.stringify({ id: 'claude-code', entry: 'agent.mjs' }));
    fs.copyFileSync(FAKE_AGENT, path.join(agentDir, 'agent.mjs'));
    fs.mkdirSync(path.join(root, 'work'));
    host = await startAgentHost({
      agents: path.join(root, 'agents'),
      worktrees: path.join(root, 'worktrees'),
      folder: path.join(root, 'work'),
      // Node rather than the bundled agents' bun, so the test needs nothing beyond the runtime running it.
      runtime: process.execPath,
    });
  });

  afterAll(async () => {
    await host?.close();
    fs.rmSync(root, { recursive: true, force: true });
  });

  test('runs one agent turn from the page through the dev server', async ({ expect }) => {
    const client = HelperClient.make(() => requestEndpoint(`${host.origin}${Shell.AGENT_HOST_PATH}`));

    expect(await EffectEx.runPromise(client.helper.agents)).toEqual([{ id: 'claude-code', available: true }]);
    expect(await EffectEx.runPromise(client.helper.defaultFolder)).toEqual(path.join(root, 'work'));

    const transcript = await EffectEx.runPromise(
      Effect.gen(function* () {
        const feed = yield* Database.add(Feed.make());
        const chat = yield* Database.add(Chat.make({ feed: Ref.make(feed), session: { harness: 'claude-code' } }));
        const sessions = yield* AcpAgent.Sessions.make();
        // Wired as `CodeAgent` wires Claude Code: the session's stream comes from the helper, and the chat works in
        // the folder the dev server reports when its project names none.
        const options: AcpAgent.AgentOptions = {
          id: 'claude-code',
          sessions,
          connect: (cwd, toolsToken) => client.helper.connect('claude-code', cwd, toolsToken),
          workspace: () => client.helper.defaultFolder.pipe(Effect.map((folder) => folder ?? path.join(root, 'work'))),
        };
        yield* AcpAgent.runTurn(options, { chat, feed }, { prompt: 'hello from the page' });
        const messages = yield* Feed.query(feed, Filter.type(Message.Message)).run;
        return {
          messages: messages.map((message) => [message.sender.role, Message.extractText(message)]),
          session: AcpAgent.sessionIdOf(chat, 'claude-code'),
        };
      }).pipe(Effect.scoped, Effect.provide(TestLayer)),
    );

    expect(transcript.session).toBe('dev-shell-1');
    expect(transcript.messages).toEqual(
      expect.arrayContaining([
        ['user', 'hello from the page'],
        ['assistant', 'echo: hello from the page'],
      ]),
    );
  });

  test('forgets an agent server that has exited and asks the dev server again', async ({ expect }) => {
    const client = HelperClient.make(() => requestEndpoint(`${host.origin}${Shell.AGENT_HOST_PATH}`));
    await EffectEx.runPromise(client.helper.agents);
    const before = await client.current();

    await host.stopServer();

    // The request in flight when the server went away fails; the next one starts a new server through the route.
    await expect(EffectEx.runPromise(client.helper.agents)).rejects.toThrow(/could not list coding agents/);
    expect(await EffectEx.runPromise(client.helper.agents)).toEqual([{ id: 'claude-code', available: true }]);
    expect((await client.current())?.token).not.toBe(before?.token);
  });
});
