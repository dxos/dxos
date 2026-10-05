//
// Copyright 2026 DXOS.org
//

import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as FetchHttpClient from 'effect/http/FetchHttpClient';
import * as Layer from 'effect/Layer';
import * as RpcClient from 'effect/rpc/RpcClient';
import * as RpcSerialization from 'effect/rpc/RpcSerialization';
import * as Scope from 'effect/Scope';
import * as Stream from 'effect/Stream';
import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { type Server, createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import { writeFixture } from '../mcp/fixture.ts';
import * as Store from '../Store.ts';
import * as Events from './Events.ts';
import * as Log from './Log.ts';
import * as Protocol from './Protocol.ts';
import * as Sandbox from './Sandbox.ts';

/**
 * Stops the real `code-index serve` under Bun with a browser attached. A tab holds the `Watch`
 * stream and Vite's HMR websocket open for as long as it lives, and Bun's `http.Server.close` waits
 * on an upgraded socket forever — which only shows in Bun, so this cannot run in-process.
 */

const BIN = fileURLToPath(new URL('../../bin/code-index.ts', import.meta.url));

/** How long a signal may take to stop serve before the store counts as leaked. */
const DEADLINE_MS = 10_000;

const listen = (server: Server): Promise<number> =>
  new Promise((resolve, reject) =>
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      return typeof address === 'object' && address !== null
        ? resolve(address.port)
        : reject(new Error('No TCP address'));
    }),
  );

/**
 * Ollama's two routes, enough for a turn: `answer` replies with prose and no tool call, so the turn
 * ends after one step; `stall` never replies, so the turn is still running when serve is stopped.
 */
const stubOllama = (mode: 'answer' | 'stall'): Server =>
  createServer((request, response) => {
    if (request.url === '/api/version') {
      response.writeHead(200, { 'content-type': 'application/json' }).end('{"version":"0.0.0"}');
    } else if (request.url === '/api/chat' && mode === 'answer') {
      request.resume();
      // A turn streams, so the reply is Ollama's NDJSON: one line per chunk, each newline-terminated.
      request.on('end', () =>
        response.writeHead(200, { 'content-type': 'application/x-ndjson' }).end(
          [
            { message: { role: 'assistant', content: 'Answ' }, done: false },
            { message: { role: 'assistant', content: 'ered.' }, done: true },
          ]
            .map((chunk) => `${JSON.stringify(chunk)}\n`)
            .join(''),
        ),
      );
    } else if (request.url !== '/api/chat') {
      response.writeHead(404).end();
    }
  });

const freePort = async (): Promise<number> => {
  const probe = createServer();
  const port = await listen(probe);
  await new Promise((resolve) => probe.close(resolve));
  return port;
};

/** Starts serve and resolves once its banner says it is listening. */
const startServe = (bun: string, options: { root: string; port: number; endpoint: string }) => {
  const child: ChildProcessWithoutNullStreams = spawn(
    bun,
    [
      BIN,
      'serve',
      '--root',
      options.root,
      '--port',
      String(options.port),
      '--provider',
      'ollama',
      '--model',
      'stub',
      '--endpoint',
      options.endpoint,
      '--no-watch',
    ],
    { stdio: ['pipe', 'pipe', 'pipe'] },
  );
  let output = '';
  const exited = new Promise<void>((resolve) => child.once('exit', () => resolve()));
  const listening = new Promise<void>((resolve, reject) => {
    const onData = (chunk: string) => {
      output += chunk;
      if (output.includes(`127.0.0.1:${options.port}`)) {
        resolve();
      }
    };
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    void exited.then(() => reject(new Error(`serve exited before listening:\n${output}`)));
  });
  return { child, listening, exited, output: () => output };
};

/** Opens the HMR websocket the way the browser's Vite client does. */
const openHmrSocket = (port: number): Promise<WebSocket> =>
  new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}/`, 'vite-hmr');
    socket.addEventListener('open', () => resolve(socket));
    socket.addEventListener('error', () => reject(new Error('HMR websocket did not open')));
  });

/** A stand-in browser tab: holds the project's `Watch` stream, sends one prompt, waits for `until`. */
const attach = (port: number, scope: Scope.Scope, until: Events.Event['_tag']) =>
  Effect.gen(function* () {
    const client = yield* RpcClient.make(Protocol.Rpcs);
    const project = yield* client.CreateProject({ title: 'shutdown' });
    const reached = yield* Deferred.make<void>();
    // The stream ends in an error when serve cuts the connection; that is the outcome under test.
    yield* client.Watch({ projectId: project.id }).pipe(
      Stream.runForEach((entry) => (entry.event._tag === until ? Deferred.succeed(reached, undefined) : Effect.void)),
      Effect.exit,
      Effect.forkIn(scope),
    );
    yield* client.Dispatch({ projectId: project.id, event: new Events.UserMessage({ text: 'Hello?' }) });
    yield* Deferred.await(reached).pipe(Effect.timeout(DEADLINE_MS));
  }).pipe(
    Effect.provide(
      RpcClient.layerProtocolHttp({ url: `http://127.0.0.1:${port}${Protocol.PATH}` }).pipe(
        Layer.provide(RpcSerialization.layerNdjson),
        Layer.provide(FetchHttpClient.layer),
      ),
    ),
    Scope.provide(scope),
  );

/** A tab left open on a project with nothing new to show: its `Watch` stream has yet to send anything. */
const idle = (port: number, scope: Scope.Scope) =>
  Effect.gen(function* () {
    const client = yield* RpcClient.make(Protocol.Rpcs);
    const project = yield* client.CreateProject({ title: 'idle' });
    yield* client.Watch({ projectId: project.id }).pipe(Stream.runDrain, Effect.exit, Effect.forkIn(scope));
    // `Info` rides its own request, so its answer means serve has also taken the `Watch` request.
    yield* client.Info();
  }).pipe(
    Effect.provide(
      RpcClient.layerProtocolHttp({ url: `http://127.0.0.1:${port}${Protocol.PATH}` }).pipe(
        Layer.provide(RpcSerialization.layerNdjson),
        Layer.provide(FetchHttpClient.layer),
      ),
    ),
    Scope.provide(scope),
  );

/** Opens the store and reads the project's log, which succeeds only once serve has released the lock. */
const reopen = (storeDir: string) =>
  Effect.gen(function* () {
    yield* Effect.flatMap(Store.Store, (store) => store.stats());
    const log = yield* Log.Log;
    const [project] = yield* log.listProjects();
    const entries = yield* log.read(project.id);
    return entries.map((entry) => entry.event._tag);
  }).pipe(Effect.provide(Layer.merge(Store.layer(storeDir), Log.layer(storeDir))), Effect.scoped);

const bun = Sandbox.interpreter();

describe.skipIf(bun === undefined)('code-index serve shutdown', () => {
  let root: string;
  let ollama: Server | undefined;
  let serve: ReturnType<typeof startServe> | undefined;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'code-index-serve-'));
    await writeFixture(root);
  });

  afterEach(async () => {
    // A serve that outlived its deadline is the failure being reported; it must not outlive the test too.
    serve?.child.kill('SIGKILL');
    await serve?.exited;
    serve = undefined;
    ollama?.closeAllConnections();
    await new Promise((resolve) => (ollama ? ollama.close(resolve) : resolve(undefined)));
    ollama = undefined;
    await rm(root, { recursive: true, force: true });
  });

  /** Runs one turn up to `until` with a browser attached, sends `signal`, and times the exit. */
  const stopAfter = async (mode: 'answer' | 'stall', until: Events.Event['_tag'], signal: NodeJS.Signals) => {
    ollama = stubOllama(mode);
    const endpoint = `http://127.0.0.1:${await listen(ollama)}`;
    const port = await freePort();
    serve = startServe(bun ?? 'bun', { root, port, endpoint });
    await serve.listening;

    const hmr = await openHmrSocket(port);
    const browser = await EffectEx.runPromise(Scope.make());
    try {
      await EffectEx.runPromise(attach(port, browser, until));
      const started = performance.now();
      serve.child.kill(signal);
      const exited = await Promise.race([
        serve.exited.then(() => true),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), DEADLINE_MS)),
      ]);
      return { exited, elapsed: performance.now() - started, output: serve.output() };
    } finally {
      hmr.close();
      await EffectEx.runPromise(Scope.close(browser, Exit.void));
    }
  };

  test('SIGTERM after a turn exits promptly and releases the store', async () => {
    const { exited, elapsed, output } = await stopAfter('answer', 'TurnEnded', 'SIGTERM');
    expect(exited, output).toBe(true);
    expect(elapsed).toBeLessThan(5_000);
    expect(await EffectEx.runPromise(reopen(join(root, 'node_modules', '.code-index')))).toEqual([
      'UserMessage',
      'AssistantMessage',
      'TurnEnded',
    ]);
  }, 60_000);

  test('SIGINT with a tab watching a quiet project exits promptly', async () => {
    ollama = stubOllama('answer');
    const endpoint = `http://127.0.0.1:${await listen(ollama)}`;
    const port = await freePort();
    serve = startServe(bun ?? 'bun', { root, port, endpoint });
    await serve.listening;
    const browser = await EffectEx.runPromise(Scope.make());
    try {
      await EffectEx.runPromise(idle(port, browser));
      const started = performance.now();
      serve.child.kill('SIGINT');
      const exited = await Promise.race([
        serve.exited.then(() => true),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), DEADLINE_MS)),
      ]);
      expect(exited, serve.output()).toBe(true);
      expect(performance.now() - started).toBeLessThan(5_000);
    } finally {
      await EffectEx.runPromise(Scope.close(browser, Exit.void));
    }
  }, 60_000);

  test('SIGINT mid-turn interrupts the turn, records it and releases the store', async () => {
    const { exited, output } = await stopAfter('stall', 'UserMessage', 'SIGINT');
    expect(exited, output).toBe(true);
    expect(await EffectEx.runPromise(reopen(join(root, 'node_modules', '.code-index')))).toEqual([
      'UserMessage',
      'TurnFailed',
    ]);
  }, 60_000);
});
