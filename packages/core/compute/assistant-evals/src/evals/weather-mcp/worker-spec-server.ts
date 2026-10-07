//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Scope from 'effect/Scope';
import { type IncomingMessage, type ServerResponse } from 'node:http';

import * as WeatherSpace from '@dxos/plugin-debug/WeatherSpace';

import { listenLoopback, loopbackUrl } from '../../loopback-server.ts';

//
// The weather Worker exactly as the template's first task specifies it, on a Node listener instead of
// Cloudflare: one endpoint speaking MCP over Streamable HTTP with one tool, `get_weather`, over the
// Open-Meteo forecast. It is the task text made executable, so a test can prove the text a session
// is handed describes a server the session's own MCP client can connect to — and that nothing the
// text leaves out is something the client needs.
//

/** The one tool, as `tools/list` advertises it. */
export const GET_WEATHER = {
  name: 'get_weather',
  description: 'Current temperature and wind speed plus the hourly series for a coordinate.',
  inputSchema: {
    type: 'object',
    properties: {
      latitude: { type: 'number', description: 'Latitude in degrees.' },
      longitude: { type: 'number', description: 'Longitude in degrees.' },
    },
    required: ['latitude', 'longitude'],
  },
} as const;

/** Every response carries these; the client runs in a browser, whose preflight fails without them. */
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, accept, authorization, mcp-session-id, mcp-protocol-version',
  'Access-Control-Expose-Headers': 'mcp-session-id',
} as const;

export type Coordinates = { readonly latitude: number; readonly longitude: number };

export type WorkerSpecServer = {
  /** The endpoint, ready to hand to a skill's `mcpServers` entry. */
  readonly url: string;
  /** How many `initialize` requests the listener answered: one per client connection. */
  readonly initializations: () => number;
};

export type StartWorkerSpecServerOptions = {
  /**
   * Fetches the upstream forecast at the given URL. Injected because a test must not reach
   * api.open-meteo.com, and because what the URL carries is part of the specification.
   */
  readonly fetchForecast: (url: string) => Promise<unknown>;
};

type JsonRpcRequest = {
  readonly jsonrpc?: string;
  readonly id?: number | string | null;
  readonly method?: string;
  readonly params?: Record<string, unknown>;
};

/** The upstream URL with the caller's coordinates substituted for the template's Berlin ones. */
export const forecastUrl = ({ latitude, longitude }: Coordinates): string =>
  WeatherSpace.FORECAST_URL.replace(/latitude=[^&]*/, `latitude=${latitude}`).replace(
    /longitude=[^&]*/,
    `longitude=${longitude}`,
  );

/** Serves the Worker specification on a loopback port for the caller's scope. */
export const startWorkerSpecServer = ({
  fetchForecast,
}: StartWorkerSpecServerOptions): Effect.Effect<WorkerSpecServer, never, Scope.Scope> =>
  Effect.gen(function* () {
    let initializations = 0;

    const respond = (
      response: ServerResponse,
      status: number,
      body?: unknown,
      headers: Record<string, string> = {},
    ): void => {
      response.writeHead(status, {
        ...CORS_HEADERS,
        ...headers,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      });
      response.end(body !== undefined ? JSON.stringify(body) : undefined);
    };

    const result = (id: JsonRpcRequest['id'], value: unknown) => ({ jsonrpc: '2.0', id, result: value });
    const failure = (id: JsonRpcRequest['id'], code: number, message: string) => ({
      jsonrpc: '2.0',
      id,
      error: { code, message },
    });

    const handleRequest = async (request: JsonRpcRequest): Promise<unknown> => {
      const { id, method, params = {} } = request;
      switch (method) {
        case 'initialize':
          initializations++;
          return result(id, {
            // The version the client asked for, so it is one the client supports.
            protocolVersion: params.protocolVersion,
            capabilities: { tools: {} },
            serverInfo: { name: 'weather-mcp', version: '0.0.0' },
          });
        case 'tools/list':
          return result(id, { tools: [GET_WEATHER] });
        case 'tools/call': {
          const { name, arguments: args } = params;
          if (name !== GET_WEATHER.name) {
            return failure(id, -32602, `Unknown tool: ${String(name)}`);
          }
          const latitude = typeof args === 'object' && args !== null && 'latitude' in args ? args.latitude : undefined;
          const longitude =
            typeof args === 'object' && args !== null && 'longitude' in args ? args.longitude : undefined;
          if (typeof latitude !== 'number' || typeof longitude !== 'number') {
            return failure(id, -32602, 'latitude and longitude are required numbers');
          }
          const forecast = await fetchForecast(forecastUrl({ latitude, longitude }));
          return result(id, { content: [{ type: 'text', text: JSON.stringify(forecast) }] });
        }
        default:
          return failure(id, -32601, `Method not found: ${method}`);
      }
    };

    const handle = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
      switch (request.method) {
        case 'OPTIONS':
          respond(response, 204);
          return;
        case 'POST':
          break;
        default:
          // No server-push stream and no sessions to end: the client reads a 405 on GET as exactly that.
          respond(response, 405, undefined, { Allow: 'POST, OPTIONS' });
          return;
      }

      const chunks: Buffer[] = [];
      for await (const chunk of request) {
        chunks.push(Buffer.from(chunk));
      }
      let message: JsonRpcRequest;
      try {
        message = JSON.parse(Buffer.concat(chunks).toString());
      } catch {
        respond(response, 400, failure(null, -32700, 'Parse error'));
        return;
      }

      // A notification answered with anything but 2xx stops the client from ever finishing `connect`.
      if (message.id === undefined || message.id === null) {
        respond(response, 202);
        return;
      }
      // An upstream failure is reported in-band, where the model can read it.
      const reply = await handleRequest(message).catch((error: unknown) =>
        failure(message.id, -32603, error instanceof Error ? error.message : String(error)),
      );
      respond(response, 200, reply);
    };

    const { port } = yield* listenLoopback(handle);
    return { url: loopbackUrl(port), initializations: () => initializations };
  });
