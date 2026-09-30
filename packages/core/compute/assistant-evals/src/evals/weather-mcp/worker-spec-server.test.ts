//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';
import * as Response from 'effect/unstable/ai/Response';
import * as Tool from 'effect/unstable/ai/Tool';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';
import { McpToolkit } from '@dxos/mcp-client';

import { TEMPERATURE } from './scenario.ts';
import { CORS_HEADERS, GET_WEATHER, forecastUrl, startWorkerSpecServer } from './worker-spec-server.ts';

/** What Open-Meteo answers, cut to the fields the tool promises. */
const BERLIN_FORECAST = {
  latitude: 52.52,
  longitude: 13.41,
  current: { time: '2026-05-20T15:00', temperature_2m: 14.6, wind_speed_10m: 9.1 },
  hourly: { time: ['2026-05-20T15:00'], temperature_2m: [14.6], relative_humidity_2m: [61], wind_speed_10m: [9.1] },
};

// The task text checked against the client the session dials with: `McpToolkit.make` is what
// `AiSession` connects a skill's servers through, so a Worker written to the text is one the chat can call.
describe('the weather Worker as the task text specifies it', () => {
  test('is a server the session’s own MCP client lists and calls a tool on', async ({ expect }) => {
    await EffectEx.runPromise(
      withServer(({ url, initializations, fetched }) =>
        Effect.gen(function* () {
          const toolkit = yield* McpToolkit.make({ url, protocol: 'http' });
          expect(Object.keys(toolkit.toolkit.tools)).toEqual(['get_weather']);
          expect(initializations()).toBe(1);
          // What a model turn does with the toolkit before any call: the response-part schema is
          // built from every tool's parameters, and the provider is shown the server's own schema.
          expect(() => Schema.NonEmptyArray(Response.StreamPart(toolkit.toolkit))).not.toThrow();
          expect(Tool.getJsonSchema(toolkit.toolkit.tools.get_weather)).toEqual(GET_WEATHER.inputSchema);

          const handlers = yield* toolkit.toolkit.pipe(Effect.provide(toolkit.layer));
          const results = yield* handlers
            .handle('get_weather', { latitude: 52.52, longitude: 13.41 })
            .pipe(Effect.provide(toolkit.layer), Effect.flatMap(Stream.runCollect));

          const [outcome] = results;
          expect(outcome?.isFailure).toBe(false);
          // The forecast comes back as text the model reads, and it names a temperature.
          expect(String(outcome?.result)).toContain('"temperature_2m":14.6');
          expect(TEMPERATURE.test(JSON.stringify(outcome?.result))).toBe(true);
          // The upstream was asked about the caller's coordinates, not the template's.
          expect(fetched).toEqual([forecastUrl({ latitude: 52.52, longitude: 13.41 })]);
        }),
      ),
    );
  });

  test('substitutes both coordinates into the upstream URL', ({ expect }) => {
    const url = new URL(forecastUrl({ latitude: -33.87, longitude: 151.21 }));
    expect(url.searchParams.get('latitude')).toBe('-33.87');
    expect(url.searchParams.get('longitude')).toBe('151.21');
    expect(url.searchParams.get('current')).toBe('temperature_2m,wind_speed_10m');
  });

  test('answers the browser client’s preflight and carries CORS headers on every response', async ({ expect }) => {
    await EffectEx.runPromise(
      withServer(({ url }) =>
        Effect.promise(async () => {
          const preflight = await fetch(url, {
            method: 'OPTIONS',
            headers: {
              'Origin': 'http://localhost',
              'Access-Control-Request-Method': 'POST',
              'Access-Control-Request-Headers': 'content-type,mcp-session-id',
            },
          });
          expect(preflight.status).toBe(204);
          for (const [header, value] of Object.entries(CORS_HEADERS)) {
            expect(preflight.headers.get(header)).toBe(value);
          }

          const listed = await fetch(url, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'accept': 'application/json, text/event-stream' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
          });
          expect(listed.status).toBe(200);
          expect(listed.headers.get('content-type')).toBe('application/json');
          expect(listed.headers.get('access-control-allow-origin')).toBe('*');
        }),
      ),
    );
  });

  test('accepts a notification with 202, refuses GET with 405, and reports an unknown method in-band', async ({
    expect,
  }) => {
    await EffectEx.runPromise(
      withServer(({ url }) =>
        Effect.promise(async () => {
          const post = (body: unknown) =>
            fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

          const initialized = await post({ jsonrpc: '2.0', method: 'notifications/initialized' });
          expect(initialized.status).toBe(202);
          expect(await initialized.text()).toBe('');

          const stream = await fetch(url, { method: 'GET', headers: { accept: 'text/event-stream' } });
          expect(stream.status).toBe(405);

          const unknown = await post({ jsonrpc: '2.0', id: 7, method: 'resources/list' });
          expect(unknown.status).toBe(200);
          expect(await unknown.json()).toEqual({
            jsonrpc: '2.0',
            id: 7,
            error: { code: -32601, message: 'Method not found: resources/list' },
          });
        }),
      ),
    );
  });
});

/** A server whose upstream is canned, recording the URL it was asked for. */
const withServer = <A, E, R>(
  body: (server: { url: string; initializations: () => number; fetched: string[] }) => Effect.Effect<A, E, R>,
) =>
  Effect.gen(function* () {
    const fetched: string[] = [];
    const server = yield* startWorkerSpecServer({
      fetchForecast: async (url) => {
        fetched.push(url);
        return BERLIN_FORECAST;
      },
    });
    return yield* body({ ...server, fetched });
  }).pipe(Effect.scoped);
