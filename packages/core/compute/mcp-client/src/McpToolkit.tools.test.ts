//
// Copyright 2026 DXOS.org
//

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';
import * as Response from 'effect/unstable/ai/Response';
import * as Tool from 'effect/unstable/ai/Tool';
import { createServer } from 'node:http';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import * as McpToolkit from './McpToolkit.ts';

/** A tool with parameters, as a server advertises one. */
const ECHO_TOOL = {
  name: 'echo',
  description: 'Returns its input.',
  inputSchema: {
    type: 'object' as const,
    properties: { text: { type: 'string' }, times: { type: 'number' } },
    required: ['text'],
  },
};

describe('McpToolkit tools', () => {
  test('a tool with parameters survives a model turn and carries the server’s schema', async ({ expect }) => {
    await EffectEx.runPromise(
      withServer((url) =>
        Effect.gen(function* () {
          const toolkit = yield* McpToolkit.make({ url, protocol: 'http' });
          const echo = toolkit.toolkit.tools.echo;
          expect(echo).toBeDefined();

          // A model turn builds the response-part schema from every tool's parameters before the
          // model is even called; a tool without a parameter AST throws here and takes the turn down.
          expect(() => Schema.NonEmptyArray(Response.StreamPart(toolkit.toolkit))).not.toThrow();
          // The provider is shown the server's schema verbatim, so what the model is told and what
          // the server validates agree.
          expect(Tool.getJsonSchema(echo)).toEqual(ECHO_TOOL.inputSchema);

          const handlers = yield* toolkit.toolkit.pipe(Effect.provide(toolkit.layer));
          const [outcome] = yield* handlers
            .handle('echo', { text: 'hi', times: 2 })
            .pipe(Effect.provide(toolkit.layer), Effect.flatMap(Stream.runCollect));
          expect(outcome?.isFailure).toBe(false);
          expect(outcome?.result).toBe('{"text":"hi","times":2}');
        }),
      ),
    );
  });
});

/** An in-process Streamable HTTP server serving `ECHO_TOOL`, one stateless transport per request. */
const withServer = <A, E, R>(body: (url: string) => Effect.Effect<A, E, R>) =>
  Effect.gen(function* () {
    const listener = yield* Effect.acquireRelease(
      Effect.sync(() =>
        createServer((request, response) => {
          // A body that is not JSON would otherwise reject with the response left open.
          (async () => {
            const chunks: Buffer[] = [];
            for await (const chunk of request) {
              chunks.push(Buffer.from(chunk));
            }
            const server = new Server({ name: 'echo', version: '0.0.0' }, { capabilities: { tools: {} } });
            server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [ECHO_TOOL] }));
            server.setRequestHandler(CallToolRequestSchema, async ({ params }) => ({
              content: [{ type: 'text', text: JSON.stringify(params.arguments) }],
            }));
            const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
            await server.connect(transport);
            response.on('close', () => {
              void transport.close();
              void server.close();
            });
            const raw = Buffer.concat(chunks).toString();
            await transport.handleRequest(request, response, raw.length > 0 ? JSON.parse(raw) : undefined);
          })().catch(() => response.destroy());
        }),
      ),
      (listener) =>
        Effect.promise(async () => {
          // Stop accepting first, then cut what is open, so nothing new arrives while closing.
          const closed = new Promise<void>((resolve) => listener.close(() => resolve()));
          listener.closeAllConnections();
          await closed;
        }),
    );
    const port = yield* Effect.callback<number>((resume) => {
      listener.once('listening', () => {
        const address = listener.address();
        resume(
          address !== null && typeof address === 'object'
            ? Effect.succeed(address.port)
            : Effect.die(new Error('unexpected address')),
        );
      });
      listener.listen(0, '127.0.0.1');
    });
    return yield* body(`http://127.0.0.1:${port}/mcp`);
  }).pipe(Effect.scoped);
