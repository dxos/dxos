//
// Copyright 2026 DXOS.org
//

import { type ExpectStatic, describe, test } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Sink from 'effect/Sink';
import * as EffectStdio from 'effect/Stdio';
import * as Stream from 'effect/Stream';

import { EffectEx } from '@dxos/effect';
import type * as ObservabilityExtension from '@dxos/observability/ObservabilityExtension';

import { analyticsStdio, makeCorrelator } from './analytics.ts';
import { handshakeAttribution } from './legacy-initialize-analytics.ts';

describe('MCP analytics', () => {
  test('captures a tool call with its arguments and error state', ({ expect }) => {
    const { calls, capture } = recordingCapture();
    const correlator = makeCorrelator(capture);

    correlator.observeRequest(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: { name: 'loadSkill', arguments: { skill: 'project' } },
      }),
    );
    correlator.observeRequest(
      JSON.stringify({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'whoami', arguments: {} } }),
    );
    correlator.observeResponse(
      JSON.stringify({ jsonrpc: '2.0', id: 5, result: { isError: true, content: [{ type: 'text', text: 'nope' }] } }),
    );
    correlator.observeResponse(JSON.stringify({ jsonrpc: '2.0', id: 4, result: { content: [] } }));

    expect(calls.toolCall).to.have.length(2);
    expect(calls.toolCall[0]).to.include({ toolName: 'whoami', isError: true });
    expect(calls.toolCall[1]).to.include({ toolName: 'loadSkill', isError: false });
    expect(calls.toolCall[1]).to.have.nested.property('parameters.skill', 'project');
    for (const call of calls.toolCall) {
      expect(call).to.have.property('durationMs').that.is.a('number');
    }
    expectEveryEventNamed(expect, calls);
  });

  test('attributes a stateless tool call to the client its request metadata names', ({ expect }) => {
    const { calls, capture } = recordingCapture();
    const correlator = makeCorrelator(capture);

    correlator.observeRequest(
      toolCall(3, {
        'io.modelcontextprotocol/protocolVersion': '2026-07-28',
        'io.modelcontextprotocol/clientInfo': { name: 'stateless-client', version: '3.0.0' },
        'io.modelcontextprotocol/clientCapabilities': {},
      }),
    );
    correlator.observeResponse(
      JSON.stringify({ jsonrpc: '2.0', id: 3, result: { resultType: 'complete', content: [] } }),
    );

    expect(calls.toolCall[0]).to.include({
      toolName: 'whoami',
      clientName: 'stateless-client',
      clientVersion: '3.0.0',
      protocolVersion: '2026-07-28',
      isError: false,
    });
    expect(calls.toolCall[0]).to.have.property('sessionId').that.is.a('string');
    expectEveryEventNamed(expect, calls);
  });

  test('a first request whose metadata names no client carries the unknown client', ({ expect }) => {
    const { calls, capture } = recordingCapture();
    const correlator = makeCorrelator(capture);

    correlator.observeRequest(toolCall(3, { 'io.modelcontextprotocol/protocolVersion': '2026-07-28' }));
    correlator.observeResponse(JSON.stringify({ jsonrpc: '2.0', id: 3, result: { content: [] } }));

    const [call] = calls.toolCall;
    expect(call).to.include({ toolName: 'whoami', clientName: 'unknown', protocolVersion: '2026-07-28' });
    expect(call.sessionId).to.be.a('string');
    expect(call.clientVersion).to.be.undefined;
    expectEveryEventNamed(expect, calls);
  });

  test('a request whose metadata names no client takes the last client a request named', ({ expect }) => {
    const { calls, capture } = recordingCapture();
    const correlator = makeCorrelator(capture);

    correlator.observeRequest(
      toolCall(2, {
        'io.modelcontextprotocol/protocolVersion': '2026-07-28',
        'io.modelcontextprotocol/clientInfo': { name: 'stateless-client', version: '3.0.0' },
      }),
    );
    correlator.observeResponse(JSON.stringify({ jsonrpc: '2.0', id: 2, result: { content: [] } }));
    correlator.observeRequest(toolCall(3, { 'io.modelcontextprotocol/protocolVersion': '2026-07-28' }));
    correlator.observeResponse(JSON.stringify({ jsonrpc: '2.0', id: 3, result: { content: [] } }));

    expect(calls.toolCall[1]).to.include({
      clientName: 'stateless-client',
      clientVersion: '3.0.0',
      protocolVersion: '2026-07-28',
    });
    expectEveryEventNamed(expect, calls);
  });

  test('a successful server/discover captures the client its request metadata names, and names the calls after it', ({
    expect,
  }) => {
    const { calls, capture } = recordingCapture();
    const correlator = makeCorrelator(capture);

    correlator.observeRequest(
      discover(1, {
        'io.modelcontextprotocol/protocolVersion': '2026-07-28',
        'io.modelcontextprotocol/clientInfo': { name: 'discover-client', version: '1.0.0' },
      }),
    );
    correlator.observeResponse(discovered(1));

    expect(calls.toolCall).to.be.empty;
    expect(calls.initialize).to.have.length(1);
    expect(calls.initialize[0]).to.include({
      clientName: 'discover-client',
      clientVersion: '1.0.0',
      protocolVersion: '2026-07-28',
    });
    expect(calls.initialize[0].sessionId).to.be.a('string');

    correlator.observeRequest(toolCall(2, { 'io.modelcontextprotocol/protocolVersion': '2026-07-28' }));
    correlator.observeResponse(JSON.stringify({ jsonrpc: '2.0', id: 2, result: { content: [] } }));

    expect(calls.toolCall[0]).to.include({
      clientName: 'discover-client',
      clientVersion: '1.0.0',
      sessionId: calls.initialize[0].sessionId,
    });
    expectEveryEventNamed(expect, calls);
  });

  test('a successful server/discover naming no client takes the last client seen, else the unknown client', ({
    expect,
  }) => {
    const { calls, capture } = recordingCapture();
    const correlator = makeCorrelator(capture);

    correlator.observeRequest(discover(1, { 'io.modelcontextprotocol/protocolVersion': '2026-07-28' }));
    correlator.observeResponse(discovered(1));
    correlator.observeRequest(
      toolCall(2, {
        'io.modelcontextprotocol/protocolVersion': '2026-07-28',
        'io.modelcontextprotocol/clientInfo': { name: 'stateless-client', version: '3.0.0' },
      }),
    );
    correlator.observeResponse(JSON.stringify({ jsonrpc: '2.0', id: 2, result: { content: [] } }));
    correlator.observeRequest(discover(3, { 'io.modelcontextprotocol/protocolVersion': '2026-07-28' }));
    correlator.observeResponse(discovered(3));

    expect(calls.initialize).to.have.length(2);
    expect(calls.initialize[0]).to.include({ clientName: 'unknown', protocolVersion: '2026-07-28' });
    expect(calls.initialize[0].clientVersion).to.be.undefined;
    expect(calls.initialize[1]).to.include({
      clientName: 'stateless-client',
      clientVersion: '3.0.0',
      protocolVersion: '2026-07-28',
    });
    expectEveryEventNamed(expect, calls);
  });

  test('an errored server/discover captures nothing', ({ expect }) => {
    const { calls, capture } = recordingCapture();
    const correlator = makeCorrelator(capture);

    correlator.observeRequest(
      discover(1, {
        'io.modelcontextprotocol/protocolVersion': '2026-07-28',
        'io.modelcontextprotocol/clientInfo': { name: 'discover-client', version: '1.0.0' },
      }),
    );
    correlator.observeResponse(
      JSON.stringify({ jsonrpc: '2.0', id: 1, error: { code: -32602, message: 'Invalid request metadata' } }),
    );

    expect(calls.initialize).to.be.empty;
    expect(calls.toolCall).to.be.empty;
  });

  test('a server/discover response with no matching request captures nothing', ({ expect }) => {
    const { calls, capture } = recordingCapture();
    const correlator = makeCorrelator(capture);

    correlator.observeResponse(discovered(1));
    correlator.observeRequest(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }));
    correlator.observeResponse(discovered(2));

    expect(calls.initialize).to.be.empty;
    expect(calls.toolCall).to.be.empty;
  });

  test('request metadata with a non-string or empty revision is ignored', ({ expect }) => {
    for (const revision of [20260728, '']) {
      const { calls, capture } = recordingCapture();
      const correlator = makeCorrelator(capture);

      correlator.observeRequest(
        toolCall(3, {
          'io.modelcontextprotocol/protocolVersion': revision,
          'io.modelcontextprotocol/clientInfo': { name: 'stateless-client', version: '3.0.0' },
        }),
      );
      correlator.observeResponse(JSON.stringify({ jsonrpc: '2.0', id: 3, result: { content: [] } }));

      const [call] = calls.toolCall;
      expect(call).to.include({ toolName: 'whoami', clientName: 'unknown' });
      expect(call.clientVersion).to.be.undefined;
      expect(call.protocolVersion).to.be.undefined;
      expectEveryEventNamed(expect, calls);
    }
  });

  test('a client name or version that is not a non-empty string is dropped and never becomes the last client', ({
    expect,
  }) => {
    const withClientInfo = (clientInfo: unknown) => ({
      'io.modelcontextprotocol/protocolVersion': '2026-07-28',
      'io.modelcontextprotocol/clientInfo': clientInfo,
    });
    const cases: { readonly meta?: Record<string, unknown>; readonly name: string; readonly version?: string }[] = [
      { meta: withClientInfo({ name: 5, version: '1.0.0' }), name: 'unknown', version: '1.0.0' },
      { meta: withClientInfo({ name: { first: 'client' }, version: 1 }), name: 'unknown' },
      { meta: withClientInfo({ name: ['client'] }), name: 'unknown' },
      { meta: withClientInfo({ name: 'test-client' }), name: 'test-client' },
      { meta: withClientInfo({ name: '', version: '1' }), name: 'unknown', version: '1' },
      { meta: withClientInfo('client'), name: 'unknown' },
      { name: 'unknown' },
    ];
    for (const { meta, name, version } of cases) {
      const { calls, capture } = recordingCapture();
      const correlator = makeCorrelator(capture);

      correlator.observeRequest(toolCall(1, meta));
      correlator.observeResponse(
        JSON.stringify({ jsonrpc: '2.0', id: 1, error: { code: -32602, message: 'Invalid request metadata' } }),
      );
      correlator.observeRequest(discover(2, { 'io.modelcontextprotocol/protocolVersion': '2026-07-28' }));
      correlator.observeResponse(discovered(2));

      const label = JSON.stringify(meta);
      expect(calls.toolCall[0].clientName, label).to.equal(name);
      expect(calls.toolCall[0].clientVersion, label).to.equal(version);
      expect(calls.initialize[0].clientName, label).to.equal(name);
      expect(calls.initialize[0].clientVersion, label).to.be.undefined;
      expectEveryEventNamed(expect, calls);
    }
  });

  test('captures a protocol-level failure as an errored call', ({ expect }) => {
    const { calls, capture } = recordingCapture();
    const correlator = makeCorrelator(capture);

    correlator.observeRequest(
      JSON.stringify({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'whoami' } }),
    );
    correlator.observeResponse(JSON.stringify({ jsonrpc: '2.0', id: 7, error: { code: -32603, message: 'boom' } }));

    expect(calls.toolCall[0]).to.include({ toolName: 'whoami', isError: true });
    expectEveryEventNamed(expect, calls);
  });

  test('taps stdio without altering what crosses it', async ({ expect }) => {
    const { calls, capture } = recordingCapture();
    const encoder = new TextEncoder();
    const request = `${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'whoami' } })}\n`;
    const response = `${JSON.stringify({ jsonrpc: '2.0', id: 1, result: { content: [] } })}\n`;
    const written: (string | Uint8Array)[] = [];

    const read = await EffectEx.runPromise(
      Effect.gen(function* () {
        const stdio = yield* EffectStdio.Stdio;
        const chunks = yield* Stream.runCollect(stdio.stdin);
        yield* Stream.run(Stream.fromArray([response]), stdio.stdout());
        return chunks;
      }).pipe(
        Effect.provide(
          analyticsStdio(capture).pipe(
            Layer.provide(
              EffectStdio.layerTest({
                stdin: Stream.fromArray([encoder.encode(request.slice(0, 20)), encoder.encode(request.slice(20))]),
                stdout: () =>
                  Sink.forEach((chunk: string | Uint8Array) =>
                    Effect.sync(() => {
                      written.push(chunk);
                    }),
                  ),
              }),
            ),
          ),
        ),
      ),
    );

    expect(new TextDecoder().decode(Uint8Array.from(read.flatMap((chunk) => [...chunk])))).to.equal(request);
    expect(written).to.deep.equal([response]);
    expect(calls.toolCall[0]).to.include({ toolName: 'whoami', isError: false });
    expectEveryEventNamed(expect, calls);
  });

  test('ignores notifications, unmatched responses and non-protocol lines', ({ expect }) => {
    const { calls, capture } = recordingCapture();
    const correlator = makeCorrelator(capture);

    correlator.observeRequest(
      JSON.stringify({ jsonrpc: '2.0', method: 'notifications/cancelled', params: { requestId: 2 } }),
    );
    correlator.observeRequest(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }));
    correlator.observeRequest('not json');
    correlator.observeResponse(JSON.stringify({ jsonrpc: '2.0', id: 2, result: { tools: [] } }));
    correlator.observeResponse(JSON.stringify({ jsonrpc: '2.0', id: 99, result: {} }));
    correlator.observeResponse('');

    expect(calls.initialize).to.be.empty;
    expect(calls.toolCall).to.be.empty;
  });

  // TODO(wittjosiah): Remove when dx mcp serve drops 2025-era MCP support.
  describe('2025-era MCP handshake attribution', () => {
    const makeHandshakeCorrelator = (capture: ObservabilityExtension.Mcp) =>
      makeCorrelator(capture, [handshakeAttribution]);

    const initialize = (correlator: ReturnType<typeof makeCorrelator>, response: object = { result: {} }) => {
      correlator.observeRequest(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: { protocolVersion: '2025-06-18', clientInfo: { name: 'claude-code', version: '2.1.0' } },
        }),
      );
      correlator.observeResponse(JSON.stringify({ jsonrpc: '2.0', id: 1, ...response }));
    };

    test('captures initialize with the client name and version', ({ expect }) => {
      const { calls, capture } = recordingCapture();
      const correlator = makeHandshakeCorrelator(capture);

      initialize(correlator, { result: { serverInfo: {} } });

      expect(calls.initialize[0]).to.include({
        clientName: 'claude-code',
        clientVersion: '2.1.0',
        protocolVersion: '2025-06-18',
      });
      expect(calls.toolCall).to.be.empty;
      expectEveryEventNamed(expect, calls);
    });

    test('carries the handshake onto every later call, sharing its session', ({ expect }) => {
      const { calls, capture } = recordingCapture();
      const correlator = makeHandshakeCorrelator(capture);

      initialize(correlator);
      correlator.observeRequest(toolCall(2));
      correlator.observeResponse(JSON.stringify({ jsonrpc: '2.0', id: 2, result: { content: [] } }));

      expect(calls.toolCall[0]).to.include({
        toolName: 'whoami',
        clientName: 'claude-code',
        clientVersion: '2.1.0',
        protocolVersion: '2025-06-18',
        sessionId: calls.initialize[0].sessionId,
      });
      expectEveryEventNamed(expect, calls);
    });

    test('a call whose metadata names no client takes the handshake client', ({ expect }) => {
      const { calls, capture } = recordingCapture();
      const correlator = makeHandshakeCorrelator(capture);

      initialize(correlator);
      correlator.observeRequest(toolCall(2, { 'io.modelcontextprotocol/protocolVersion': '2026-07-28' }));
      correlator.observeResponse(JSON.stringify({ jsonrpc: '2.0', id: 2, result: { content: [] } }));

      expect(calls.toolCall[0]).to.include({
        clientName: 'claude-code',
        clientVersion: '2.1.0',
        protocolVersion: '2026-07-28',
      });
      expectEveryEventNamed(expect, calls);
    });

    test('a null client name in the metadata takes the handshake name', ({ expect }) => {
      const { calls, capture } = recordingCapture();
      const correlator = makeHandshakeCorrelator(capture);

      initialize(correlator);
      correlator.observeRequest(
        toolCall(2, {
          'io.modelcontextprotocol/protocolVersion': '2026-07-28',
          'io.modelcontextprotocol/clientInfo': { name: null, version: '3.0.0' },
        }),
      );
      correlator.observeResponse(JSON.stringify({ jsonrpc: '2.0', id: 2, result: { content: [] } }));

      expect(calls.toolCall[0]).to.include({
        clientName: 'claude-code',
        clientVersion: '3.0.0',
        protocolVersion: '2026-07-28',
      });
      expectEveryEventNamed(expect, calls);
    });

    test('an empty client name or version in the metadata takes the handshake client', ({ expect }) => {
      const { calls, capture } = recordingCapture();
      const correlator = makeHandshakeCorrelator(capture);

      initialize(correlator);
      correlator.observeRequest(
        discover(2, {
          'io.modelcontextprotocol/protocolVersion': '2026-07-28',
          'io.modelcontextprotocol/clientInfo': { name: '', version: '' },
        }),
      );
      correlator.observeResponse(discovered(2));

      expect(calls.initialize).to.have.length(2);
      expect(calls.initialize[1]).to.include({
        clientName: 'claude-code',
        clientVersion: '2.1.0',
        protocolVersion: '2026-07-28',
      });
      expectEveryEventNamed(expect, calls);
    });

    test('metadata with a non-string revision takes the whole handshake', ({ expect }) => {
      const { calls, capture } = recordingCapture();
      const correlator = makeHandshakeCorrelator(capture);

      initialize(correlator);
      correlator.observeRequest(
        toolCall(2, {
          'io.modelcontextprotocol/protocolVersion': 20260728,
          'io.modelcontextprotocol/clientInfo': { name: 'stateless-client', version: '3.0.0' },
        }),
      );
      correlator.observeResponse(JSON.stringify({ jsonrpc: '2.0', id: 2, result: { content: [] } }));

      expect(calls.toolCall[0]).to.include({
        clientName: 'claude-code',
        clientVersion: '2.1.0',
        protocolVersion: '2025-06-18',
      });
      expectEveryEventNamed(expect, calls);
    });

    test('an errored initialize captures nothing and records no handshake', ({ expect }) => {
      const { calls, capture } = recordingCapture();
      const correlator = makeHandshakeCorrelator(capture);

      initialize(correlator, { error: { code: -32602, message: 'bad params' } });
      correlator.observeRequest(toolCall(2));
      correlator.observeResponse(JSON.stringify({ jsonrpc: '2.0', id: 2, result: { content: [] } }));

      expect(calls.initialize).to.be.empty;
      expect(calls.toolCall[0]).to.include({ toolName: 'whoami', clientName: 'unknown' });
      expect(calls.toolCall[0].clientVersion).to.be.undefined;
      expect(calls.toolCall[0].protocolVersion).to.be.undefined;
      expectEveryEventNamed(expect, calls);
    });

    test('a server/discover whose metadata names no client takes the handshake client', ({ expect }) => {
      const { calls, capture } = recordingCapture();
      const correlator = makeHandshakeCorrelator(capture);

      initialize(correlator);
      correlator.observeRequest(discover(2, { 'io.modelcontextprotocol/protocolVersion': '2026-07-28' }));
      correlator.observeResponse(discovered(2));

      expect(calls.initialize).to.have.length(2);
      expect(calls.initialize[1]).to.include({
        clientName: 'claude-code',
        clientVersion: '2.1.0',
        protocolVersion: '2026-07-28',
        sessionId: calls.initialize[0].sessionId,
      });
      expectEveryEventNamed(expect, calls);
    });

    test('a tool call before initialize carries the unknown client', ({ expect }) => {
      const { calls, capture } = recordingCapture();
      const correlator = makeHandshakeCorrelator(capture);

      correlator.observeRequest(toolCall(2));
      correlator.observeResponse(JSON.stringify({ jsonrpc: '2.0', id: 2, result: { content: [] } }));

      expect(calls.toolCall[0]).to.include({ toolName: 'whoami', clientName: 'unknown' });
      expectEveryEventNamed(expect, calls);
    });

    test('an initialize naming no client carries the unknown client', ({ expect }) => {
      const { calls, capture } = recordingCapture();
      const correlator = makeHandshakeCorrelator(capture);

      correlator.observeRequest(
        JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } }),
      );
      correlator.observeResponse(JSON.stringify({ jsonrpc: '2.0', id: 1, result: {} }));

      expect(calls.initialize[0]).to.include({ clientName: 'unknown', protocolVersion: '2025-06-18' });
      expectEveryEventNamed(expect, calls);
    });

    test('notifications/initialized captures nothing', ({ expect }) => {
      const { calls, capture } = recordingCapture();
      const correlator = makeHandshakeCorrelator(capture);

      correlator.observeRequest(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }));

      expect(calls.initialize).to.be.empty;
      expect(calls.toolCall).to.be.empty;
    });
  });
});

const discover = (id: number, meta: Record<string, unknown>): string =>
  JSON.stringify({ jsonrpc: '2.0', id, method: 'server/discover', params: { _meta: meta } });

const discovered = (id: number): string =>
  JSON.stringify({ jsonrpc: '2.0', id, result: { resultType: 'complete', supportedVersions: ['2026-07-28'] } });

const toolCall = (id: number, meta?: Record<string, unknown>): string =>
  JSON.stringify({
    jsonrpc: '2.0',
    id,
    method: 'tools/call',
    params: { name: 'whoami', arguments: {}, ...(meta ? { _meta: meta } : {}) },
  });

const recordingCapture = () => {
  const calls = {
    initialize: new Array<ObservabilityExtension.McpSession>(),
    toolCall: new Array<Parameters<ObservabilityExtension.Mcp['captureToolCall']>[0]>(),
  };
  const capture: ObservabilityExtension.Mcp = {
    captureInitialize: (session) => calls.initialize.push(session),
    captureToolCall: (call) => calls.toolCall.push(call),
  };
  return { calls, capture };
};

/** Fails unless every captured event names its client. */
const expectEveryEventNamed = (expect: ExpectStatic, calls: ReturnType<typeof recordingCapture>['calls']): void => {
  const events: ObservabilityExtension.McpSession[] = [...calls.initialize, ...calls.toolCall];
  for (const event of events) {
    expect(event.clientName, JSON.stringify(event)).to.be.a('string').that.is.not.empty;
  }
};
