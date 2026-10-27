//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Schema from 'effect/Schema';
import { randomBytes } from 'node:crypto';
import http from 'node:http';
import { afterEach, beforeEach, describe, test } from 'vitest';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import { Config } from '@dxos/client';
import * as Operation from '@dxos/compute/Operation';
import { verifyPresentation } from '@dxos/credentials';
import * as EffectEx from '@dxos/effect/EffectEx';
import { invariant } from '@dxos/invariant';
import { DXN, URI } from '@dxos/keys';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import * as Harness from '@dxos/plugin-testing/Harness';
import { EdgeCredentialsHeaderCodec } from '@dxos/protocols';
import { buf } from '@dxos/protocols/buf';
import { PresentationSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { RoutinePlugin } from '#plugin';

await Harness.preload({ plugins: [ClientPlugin.make({}), RoutinePlugin()] });

const Double = Operation.make({
  meta: { key: DXN.make('com.example.operation.test.double'), name: 'Double' },
  input: Schema.Struct({ value: Schema.Number }),
  output: Schema.Number,
});

const DeployedDouble = Operation.make({
  meta: {
    key: DXN.make('com.example.operation.test.deployedDouble'),
    name: 'Deployed double',
    deployedId: 'fn-double',
  },
  input: Schema.Struct({ value: Schema.Number }),
  output: Schema.Number,
});

/** One request EDGE's function route answered. */
type FunctionCall = {
  readonly functionId: string;
  readonly spaceId: string | null;
  readonly input: unknown;
};

/**
 * Stands in for EDGE over real HTTP: issues a VerifiablePresentation challenge, accepts only a presentation that
 * verifies and is bound to it, and runs `POST /compute/functions/:id` against the handlers it is given. Every
 * other route (the client's own EDGE probes) answers 404.
 */
const startEdge = async (handlers: Record<string, (input: unknown) => unknown>) => {
  const challenge = randomBytes(32);
  const calls: FunctionCall[] = [];
  const rejected: string[] = [];

  const challengeHeader = { 'WWW-Authenticate': `VerifiablePresentation challenge="${challenge.toString('base64')}"` };
  const send = (res: http.ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) => {
    res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
    res.end(JSON.stringify(body));
  };

  const authenticated = async (header: string | undefined): Promise<boolean> => {
    const bytes = EdgeCredentialsHeaderCodec.decode(header);
    if (!bytes) {
      return false;
    }
    const presentation = buf.fromBinary(PresentationSchema, bytes);
    const verification = await verifyPresentation(presentation);
    const nonce = presentation.proofs[0]?.nonce;
    return verification.kind === 'pass' && nonce !== undefined && Buffer.from(nonce).equals(challenge);
  };

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://edge');
    if (url.pathname === '/auth') {
      return send(res, 401, { success: false }, challengeHeader);
    }
    const match = /^\/compute\/functions\/([^/]+)$/.exec(url.pathname);
    if (req.method !== 'POST' || !match) {
      return send(res, 404, { success: false, message: 'not found' });
    }
    const functionId = decodeURIComponent(match[1]);
    if (!(await authenticated(req.headers.authorization))) {
      rejected.push(functionId);
      return send(res, 401, { success: false }, challengeHeader);
    }
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    calls.push({ functionId, spaceId: url.searchParams.get('spaceId'), input });
    const handler = handlers[functionId];
    if (!handler) {
      return send(res, 404, { success: false, message: `unknown function ${functionId}` });
    }
    return send(res, 200, { success: true, data: handler(input) });
  });
  server.on('upgrade', (_req, socket) => socket.destroy());
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  invariant(address !== null && typeof address === 'object', 'server is listening on a port');
  const { port } = address;

  return {
    url: `http://127.0.0.1:${port}`,
    calls,
    rejected,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
};

type Edge = Awaited<ReturnType<typeof startEdge>>;

/** EDGE's side of {@link Double}: decodes its wire input as the host does. */
const double = (input: unknown) => Schema.decodeUnknownSync(Double.input)(input).value * 2;

/** The Composer app with a signed-in identity, its client pointed at `edgeUrl` when one is given. */
const createApp = async (edgeUrl?: string) => {
  const config = edgeUrl ? new Config({ runtime: { services: { edge: { url: edgeUrl } } } }) : undefined;
  const harness = await Harness.createComposerTestApp({
    plugins: [ClientPlugin.make(config ? { config } : {}), RoutinePlugin()],
  });
  const { defaultSpace } = await EffectEx.runAndForwardErrors(
    initializeIdentity(harness.get(ClientCapabilities.Client)),
  );
  return { harness, spaceId: defaultSpace.id };
};

type App = Awaited<ReturnType<typeof createApp>>;

/** Keys of the processes the app's manager knows, local and remote. */
const processKeys = async ({ harness }: App) =>
  (await harness.runPromise(harness.get(Capabilities.ProcessManager).processTree)).map(({ key }) => key);

const invoke = <I, O>(
  { harness }: App,
  op: Operation.Definition<I, O>,
  input: I,
  options: Operation.InvokeOptions,
): Promise<Exit.Exit<O, unknown>> =>
  harness.runPromise(Effect.exit(harness.get(Capabilities.OperationInvoker).invoke(op, input, options)));

describe("the Composer app's on:'edge' invocations", () => {
  let edge: Edge;
  let app: App;

  beforeEach(async () => {
    edge = await startEdge({
      [String(Double.meta.key)]: double,
      'fn-double': double,
      'com.example.operation.test.broken': () => 'not a number',
    });
    app = await createApp(edge.url);
  });

  afterEach(async () => {
    await app.harness[Symbol.asyncDispose]();
    await edge.close();
  });

  test('run as one authenticated request to EDGE, without spawning a process', async ({ expect }) => {
    const exit = await invoke(app, Double, { value: 21 }, { on: 'edge', spaceId: app.spaceId });

    expect(exit).toEqual(Exit.succeed(42));
    expect(edge.calls).toEqual([{ functionId: String(Double.meta.key), spaceId: app.spaceId, input: { value: 21 } }]);
    expect(edge.rejected).toEqual([]);
    expect(await processKeys(app)).not.toContain(DXN.getName(Double.meta.key));
  });

  test('address a deployed function by its deployment id', async ({ expect }) => {
    const exit = await invoke(app, DeployedDouble, { value: 4 }, { on: 'edge', spaceId: app.spaceId });

    expect(exit).toEqual(Exit.succeed(8));
    expect(edge.calls).toEqual([{ functionId: 'fn-double', spaceId: app.spaceId, input: { value: 4 } }]);
  });

  test("fail when EDGE's answer does not decode as the operation's output", async ({ expect }) => {
    const Broken = Operation.make({
      meta: { key: DXN.make('com.example.operation.test.broken'), name: 'Broken' },
      input: Schema.Struct({ value: Schema.Number }),
      output: Schema.Number,
    });

    const exit = await invoke(app, Broken, { value: 1 }, { on: 'edge', spaceId: app.spaceId });

    expect(Exit.isFailure(exit)).toBe(true);
    expect(edge.calls).toHaveLength(1);
  });

  test('fail when EDGE does not host the operation', async ({ expect }) => {
    const Unknown = Operation.make({
      meta: { key: DXN.make('com.example.operation.test.unknown'), name: 'Unknown' },
      input: Schema.Struct({ value: Schema.Number }),
      output: Schema.Number,
    });

    const exit = await invoke(app, Unknown, { value: 1 }, { on: 'edge', spaceId: app.spaceId });

    expect(Exit.isFailure(exit)).toBe(true);
    expect(edge.calls.map(({ functionId }) => functionId)).toEqual([String(Unknown.meta.key)]);
  });

  test('refuse a call carrying a conversation, without reaching EDGE', async ({ expect }) => {
    const exit = await invoke(
      app,
      Double,
      { value: 1 },
      { on: 'edge', spaceId: app.spaceId, conversation: URI.make(`echo://${app.spaceId}/01JTESTCONVERSATION00000000`) },
    );

    expect(Exit.hasDies(exit)).toBe(true);
    expect(edge.calls).toEqual([]);
  });

  test('schedule as a request to EDGE', async ({ expect }) => {
    await app.harness.runPromise(
      app.harness
        .get(Capabilities.OperationInvoker)
        .schedule(Double, { value: 5 }, { on: 'edge', spaceId: app.spaceId }),
    );

    await expect
      .poll(() => edge.calls)
      .toEqual([{ functionId: String(Double.meta.key), spaceId: app.spaceId, input: { value: 5 } }]);
    expect(await processKeys(app)).not.toContain(DXN.getName(Double.meta.key));
  });
});

describe("the Composer app's on:'edge' invocations without EDGE", () => {
  test('are refused rather than run locally', async ({ expect }) => {
    const app = await createApp();
    try {
      const exit = await invoke(app, Double, { value: 1 }, { on: 'edge', spaceId: app.spaceId });

      expect(Exit.isFailure(exit)).toBe(true);
      expect(await processKeys(app)).not.toContain(DXN.getName(Double.meta.key));
    } finally {
      await app.harness[Symbol.asyncDispose]();
    }
  });
});
