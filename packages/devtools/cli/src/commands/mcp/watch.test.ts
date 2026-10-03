//
// Copyright 2026 DXOS.org
//

import { describe, test } from '@effect/vitest';
import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { MCP_REQUEST_META } from '../../testing/index.ts';
import { WATCH_READY_SENTINEL } from './watch-protocol.ts';

/**
 * Covers both reload strategies against a stub server, because the mechanism under test is the
 * transport rather than the projected surface and a real boot per reload would dominate the
 * runtime. What each proves differs: from source that `bun --watch` reloads in place so the
 * client's stdio survives, and from the binary that the supervisor's own restart is equally
 * invisible. The reload replays are the same code on both paths; each block still runs both
 * strategies because the ready gate differs between an in-place reload and a respawn.
 */

const RUNNER = fileURLToPath(new URL('../../testing/watch-runner.ts', import.meta.url));
const BIN = fileURLToPath(new URL('../../../bin/dx', import.meta.url));

/** Answers just enough of the protocol to show which realm replied. */
const PROTOCOL = `
const send = (message) => process.stdout.write(JSON.stringify(message) + '\\n');
const handlers = {
  'tools/list': (message) => send({ jsonrpc: '2.0', id: message.id, result: { marker } }),
  'subscriptions/listen': (message) =>
    send({
      jsonrpc: '2.0',
      method: 'notifications/subscriptions/acknowledged',
      params: {
        _meta: { 'io.modelcontextprotocol/subscriptionId': message.id },
        notifications: message.params.notifications,
      },
    }),
  // TODO(wittjosiah): Remove when dx mcp serve drops 2025-era MCP support.
  initialize: (message) =>
    send({ jsonrpc: '2.0', id: message.id, result: { serverInfo: { name: 'fixture', version: marker } } }),
};
let buffer = '';
process.stdin.on('data', (chunk) => {
  buffer += String(chunk);
  const lines = buffer.split('\\n');
  buffer = lines.pop() ?? '';
  for (const line of lines.filter((entry) => entry.trim().length > 0)) {
    const message = JSON.parse(line);
    handlers[message.method]?.(message);
  }
});
process.stdin.on('end', () => process.exit(0));
`;

/** Source strategy: `marker` is an imported module, so bun's watcher sees the edit. */
const SOURCE_FIXTURE = `
import { marker } from './marker';
${PROTOCOL}
process.stderr.write('${WATCH_READY_SENTINEL}\\n');
`;

/**
 * Binary strategy: `marker` is read from the plugin directory the fixture reports, standing in for
 * a dev-installed plugin. Each respawn is a new process, so a plain read picks up the edit.
 */
const BUNDLED_FIXTURE = `
import fs from 'node:fs';
const pluginDir = process.argv[2];
const marker = fs.readFileSync(pluginDir + '/src/nested/marker.txt', 'utf8').trim();
${PROTOCOL}
process.stderr.write('${WATCH_READY_SENTINEL} ' + JSON.stringify({ watch: [pluginDir] }) + '\\n');
`;

type Message = { jsonrpc?: string; id?: number | string; method?: string; params?: any; result?: any; error?: any };

type Strategy = {
  readonly name: string;
  /** Starts the supervisor over a fixture whose marker reads `v1`. */
  readonly start: (dir: string) => ChildProcessWithoutNullStreams;
  /** Changes the marker to `v2`. */
  readonly edit: (dir: string) => void;
};

const STRATEGIES: readonly Strategy[] = [
  {
    name: 'source',
    start: (dir) => {
      fs.writeFileSync(path.join(dir, 'marker.ts'), "export const marker = 'v1';\n");
      fs.writeFileSync(path.join(dir, 'server.ts'), SOURCE_FIXTURE);
      return runSupervisor({ entry: path.join(dir, 'server.ts'), args: [] });
    },
    edit: (dir) => fs.writeFileSync(path.join(dir, 'marker.ts'), "export const marker = 'v2';\n"),
  },
  {
    name: 'binary',
    start: (dir) => {
      const pluginDir = path.join(dir, 'plugin');
      // Nested, so the watch has to be recursive to see it — as a real plugin's `src/**` is.
      fs.mkdirSync(path.join(pluginDir, 'src', 'nested'), { recursive: true });
      fs.writeFileSync(path.join(pluginDir, 'src', 'nested', 'marker.txt'), 'v1\n');
      fs.writeFileSync(path.join(dir, 'server.ts'), BUNDLED_FIXTURE);
      // `execPath` stands in for the compiled binary re-running itself; the supervisor's own restart
      // is what is under test, not what the executable happens to be.
      return runSupervisor({ bundled: true, execPath: 'bun', args: [path.join(dir, 'server.ts'), pluginDir] });
    },
    edit: (dir) => fs.writeFileSync(path.join(dir, 'plugin', 'src', 'nested', 'marker.txt'), 'v2\n'),
  },
];

describe('dx mcp serve --watch', () => {
  // What outlives the realm is the client's open subscription, which the new realm holds no state for.
  for (const strategy of STRATEGIES) {
    test(`${strategy.name} strategy: a stateless client keeps its subscription across a reload`, async ({ expect }) => {
      await withSupervisor(strategy, async ({ messages, send, waitFor, edit }) => {
        const acknowledged = (message: Message) => message.method === 'notifications/subscriptions/acknowledged';

        send({
          jsonrpc: '2.0',
          id: 1,
          method: 'subscriptions/listen',
          params: { _meta: MCP_REQUEST_META, notifications: { toolsListChanged: true } },
        });
        await waitFor('acknowledged', acknowledged);
        // The fixture never answers a tool call, so the reload strands it.
        send({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { _meta: MCP_REQUEST_META, name: 'hang' } });
        send({ jsonrpc: '2.0', id: 3, method: 'tools/list', params: { _meta: MCP_REQUEST_META } });
        expect((await waitFor('tools/list', (message) => message.id === 3)).result.marker).to.equal('v1');

        edit();
        const changed = await waitFor(
          'tools/list_changed',
          (message) => message.method === 'notifications/tools/list_changed',
        );
        expect(changed.jsonrpc).to.equal('2.0');
        expect(changed.params._meta['io.modelcontextprotocol/subscriptionId']).to.equal(1);
        expect((await waitFor('stranded call', (message) => message.id === 2)).error.code).to.equal(-32603);

        send({ jsonrpc: '2.0', id: 4, method: 'tools/list', params: { _meta: MCP_REQUEST_META } });
        expect((await waitFor('tools/list', (message) => message.id === 4)).result.marker).to.equal('v2');
        // The re-sent subscription is acknowledged by the new realm but not to the client, the stream
        // stays open, and nothing the client did not ask for arrives on it.
        expect(messages.filter(acknowledged)).to.have.length(1);
        expect(messages.filter((message) => message.id === 1)).to.be.empty;
        expect(messages.some((message) => message.method === 'notifications/prompts/list_changed')).to.be.false;
      });
    }, 60_000);
  }

  // The tests driving the supervisor directly are fast but skip the CLI runtime and run from
  // whatever cwd vitest has — so they missed the defect this covers. `--watch` runs its child with
  // `--conditions=source`, bun resolves `tsconfig.json` from the cwd rather than from the file it
  // compiles, and an MCP client launches `dx` from the user's own project. Without a tsconfig
  // carrying `experimentalDecorators`, `@synchronized` died on `descriptor.value` during client
  // startup, the ready sentinel never arrived, and the client saw only a timeout.
  test('answers server/discover when launched from an unrelated directory', async ({ expect }) => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'dx-mcp-cwd-'));
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'dx-mcp-home-'));
    const child = spawn(BIN, ['mcp', 'serve', '--watch'], {
      cwd,
      env: { ...process.env, HOME: home, DX_DEBUG: 'error', NO_COLOR: '1' },
    });
    const { send, waitFor } = driver(child);

    try {
      send({ jsonrpc: '2.0', id: 1, method: 'server/discover', params: { _meta: MCP_REQUEST_META } });
      const answer = await waitFor('server/discover', (message) => message.id === 1, 120_000);
      expect(answer.result._meta['io.modelcontextprotocol/serverInfo']).to.be.an('object');
    } finally {
      await stop(child);
      fs.rmSync(cwd, { recursive: true, force: true });
      fs.rmSync(home, { recursive: true, force: true });
    }
  }, 180_000);

  // TODO(wittjosiah): Remove when dx mcp serve drops 2025-era MCP support.
  describe('2025-era MCP handshake replay', () => {
    const initialize = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } },
    };

    for (const strategy of STRATEGIES) {
      test(`${strategy.name} strategy: replays the handshake so an edit is invisible to the client`, async ({
        expect,
      }) => {
        await withSupervisor(strategy, async ({ messages, send, waitFor, edit }) => {
          send(initialize);
          expect((await waitFor('initialize', (message) => message.id === 1)).result.serverInfo.version).to.equal('v1');
          send({ jsonrpc: '2.0', method: 'notifications/initialized' });

          edit();
          const tools = await waitFor(
            'tools/list_changed',
            (message) => message.method === 'notifications/tools/list_changed',
          );
          const prompts = await waitFor(
            'prompts/list_changed',
            (message) => message.method === 'notifications/prompts/list_changed',
          );
          expect(tools.jsonrpc).to.equal('2.0');
          expect(prompts.jsonrpc).to.equal('2.0');

          // The client never re-initialized and never reconnected, yet reaches the reloaded realm.
          send({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
          expect((await waitFor('tools/list', (message) => message.id === 2)).result.marker).to.equal('v2');
          // The replayed handshake is swallowed rather than forwarded; the client saw one result.
          expect(messages.filter((message) => message.id === 1)).to.have.length(1);
        });
      }, 60_000);
    }
  });
});

/** Runs `run` against a supervisor started by `strategy` in a fresh directory, then tears both down. */
const withSupervisor = async (
  strategy: Strategy,
  run: (session: ReturnType<typeof driver> & { edit: () => void }) => Promise<void>,
) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `dx-mcp-watch-${strategy.name}-`));
  const child = strategy.start(dir);
  try {
    await run({ ...driver(child), edit: () => strategy.edit(dir) });
  } finally {
    await stop(child);
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

/** Collects the supervisor's stdio and drives requests into its stdin. */
const driver = (child: ChildProcessWithoutNullStreams) => {
  const messages: Message[] = [];
  const stderr: string[] = [];
  let buffer = '';
  child.stdout.on('data', (chunk) => {
    buffer += String(chunk);
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines.filter((entry) => entry.trim().length > 0)) {
      try {
        messages.push(JSON.parse(line));
      } catch {
        // Not a protocol message; the transport is line-delimited JSON and anything else is noise.
      }
    }
  });
  // Drained so a timeout can say why — without a reader the child's diagnostics sit in a pipe
  // nobody ever sees.
  child.stderr.on('data', (chunk) => stderr.push(String(chunk)));

  const send = (message: unknown) => child.stdin.write(`${JSON.stringify(message)}\n`);
  const waitFor = async (label: string, match: (message: Message) => boolean, timeout = 30_000): Promise<Message> => {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const found = messages.find(match);
      if (found) {
        return found;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    const diagnostics = stderr.join('').split('\n').slice(-20).join('\n');
    throw new Error(`timed out awaiting ${label}; saw ${JSON.stringify(messages)}\nstderr tail:\n${diagnostics}`);
  };
  return { messages, send, waitFor };
};

// `--conditions=source` so the runner resolves workspace packages without a build, as `bin/dx`'s
// `DX_SOURCE=1` path does. Safe here where `bin/dx` warns it is not: the runner reaches only
// `effect`, `@dxos/effect` and `@dxos/errors`, none of the third-party packages whose unshipped
// `source` fields break that path.
const runSupervisor = (options: unknown) =>
  spawn('bun', ['--conditions=source', 'run', RUNNER, JSON.stringify(options)], {
    env: { ...process.env, NO_COLOR: '1' },
  });

/**
 * Ends the supervisor's stdin — its own shutdown path, which also reaps the server it spawned —
 * and escalates to SIGKILL only if that stalls. A bare SIGKILL would orphan the spawned server.
 */
const stop = async (child: ChildProcessWithoutNullStreams) => {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }
  const exited = new Promise((resolve) => child.once('exit', resolve));
  child.stdin.end();
  const escalate = setTimeout(() => child.kill('SIGKILL'), 5_000);
  await exited;
  clearTimeout(escalate);
};
