//
// Copyright 2026 DXOS.org
//

import { describe, test } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Sink from 'effect/Sink';
import * as EffectStdio from 'effect/Stdio';
import * as Stream from 'effect/Stream';

import { EffectEx } from '@dxos/effect';
import { type ObservabilityExtension } from '@dxos/observability';

import { analyticsStdio, makeCorrelator } from './analytics';

const recordingCapture = () => {
  const calls: { initialize: unknown[]; toolCall: unknown[] } = { initialize: [], toolCall: [] };
  const capture: ObservabilityExtension.Mcp = {
    captureInitialize: (client) => calls.initialize.push(client),
    captureToolCall: (call) => calls.toolCall.push(call),
  };
  return { calls, capture };
};

describe('MCP analytics', () => {
  test('captures initialize with the client name and version', ({ expect }) => {
    const { calls, capture } = recordingCapture();
    const correlator = makeCorrelator(capture);

    correlator.observeRequest(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { clientInfo: { name: 'claude-code', version: '2.1.0' } },
      }),
    );
    correlator.observeResponse(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { serverInfo: {} } }));

    expect(calls.initialize).to.deep.equal([{ name: 'claude-code', version: '2.1.0' }]);
    expect(calls.toolCall).to.be.empty;
  });

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

    // Answered out of order: each response pairs with its own request.
    expect(calls.toolCall).to.have.length(2);
    expect(calls.toolCall[0]).to.include({ toolName: 'whoami', isError: true });
    expect(calls.toolCall[1]).to.include({ toolName: 'loadSkill', isError: false });
    expect(calls.toolCall[1]).to.have.nested.property('parameters.skill', 'project');
    for (const call of calls.toolCall) {
      expect(call).to.have.property('durationMs').that.is.a('number');
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
                // Split mid-line, so the reader is exercised on partial frames rather than whole ones.
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
  });

  test('ignores notifications, unmatched responses and non-protocol lines', ({ expect }) => {
    const { calls, capture } = recordingCapture();
    const correlator = makeCorrelator(capture);

    correlator.observeRequest(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }));
    correlator.observeRequest(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }));
    correlator.observeRequest('not json');
    correlator.observeResponse(JSON.stringify({ jsonrpc: '2.0', id: 2, result: { tools: [] } }));
    correlator.observeResponse(JSON.stringify({ jsonrpc: '2.0', id: 99, result: {} }));
    correlator.observeResponse('');

    expect(calls.initialize).to.be.empty;
    expect(calls.toolCall).to.be.empty;
  });
});
