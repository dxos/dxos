//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type ToolInvocation } from '../../assertions.ts';
import { WORKER_URL, evaluateHandOff } from './scenario.ts';

// The eval's headline dimension is an ordering fact inside one transcript, pinned here on synthetic
// transcripts rather than only on a run that takes half an hour to produce one.
describe('evaluateHandOff', () => {
  test('a forecast after the configuring write is a hand-off', ({ expect }) => {
    expect(evaluateHandOff([configure(SERVER, 10), forecast(20)], { server: WORKER_URL })).toEqual({
      configured: true,
      called: true,
      calledAfterConfiguring: true,
    });
  });

  test('a forecast before the write counts as a call but not as a hand-off', ({ expect }) => {
    expect(evaluateHandOff([forecast(5), configure(SERVER, 10)], { server: WORKER_URL })).toEqual({
      configured: true,
      called: true,
      calledAfterConfiguring: false,
    });
  });

  test('nothing configured, nothing called', ({ expect }) => {
    expect(evaluateHandOff([], { server: WORKER_URL })).toEqual({
      configured: false,
      called: false,
      calledAfterConfiguring: false,
    });
  });

  test('a write that failed, or that named some other server, did not configure this one', ({ expect }) => {
    const failed = evaluateHandOff([configure(SERVER, 10, 'boom'), forecast(20)], { server: WORKER_URL });
    expect(failed.configured).toBe(false);
    expect(failed.calledAfterConfiguring).toBe(false);

    const elsewhere = evaluateHandOff([configure('http://localhost:8787', 10), forecast(20)], {
      server: WORKER_URL,
    });
    expect(elsewhere.configured).toBe(false);

    // A tool that merely mentions the servers (a query, a read) is not the write that configures them.
    const read = { ...configure(SERVER, 10), operationKey: 'dxn:org.dxos.operation.space.getObjects' };
    expect(evaluateHandOff([read, forecast(20)], { server: WORKER_URL }).configured).toBe(false);
  });

  test('the server is whatever the caller names', ({ expect }) => {
    const local = evaluateHandOff([configure('http://127.0.0.1:43210/', 10), forecast(20)], {
      server: /127\.0\.0\.1/,
    });
    expect(local.calledAfterConfiguring).toBe(true);
  });

  test('a curl of the upstream, a failed tool call, or a result without a temperature is not a call', ({ expect }) => {
    const shelled = evaluateHandOff([configure(SERVER, 10), curl(20)], { server: WORKER_URL });
    expect(shelled.called).toBe(false);

    const errored = evaluateHandOff([configure(SERVER, 10), forecast(20, { error: 'connection refused' })], {
      server: WORKER_URL,
    });
    expect(errored.called).toBe(false);

    const empty = evaluateHandOff(
      [configure(SERVER, 10), forecast(20, { result: '{"hourly":{"temperature_2m":[]}}' })],
      {
        server: WORKER_URL,
      },
    );
    expect(empty.called).toBe(false);
  });
});

const SERVER = 'https://weather-mcp.example.workers.dev';

/** A configuring write, as the transcript records the Database skill's update tool. */
const configure = (url: string, at: number, error?: string): ToolInvocation => ({
  name: 'update_object',
  operationKey: 'dxn:org.dxos.operation.space.updateObject',
  input: JSON.stringify({ properties: { mcpServers: [{ name: 'weather', url, protocol: 'http' }] } }),
  result: {},
  error,
  calledAt: at,
  resultAt: at + 1,
});

/** A forecast coming back from the server's tool: no operation key, since an MCP tool has none. */
const forecast = (at: number, overrides: Partial<ToolInvocation> = {}): ToolInvocation => ({
  name: 'get_weather',
  input: JSON.stringify({ latitude: 52.52, longitude: 13.41 }),
  result: '{"current":{"temperature_2m":14.6,"wind_speed_10m":9.1}}',
  calledAt: at,
  resultAt: at + 1,
  ...overrides,
});

/** A shell command that reached the upstream directly: a forecast, but not through the server. */
const curl = (at: number): ToolInvocation =>
  forecast(at, { name: 'exec', operationKey: 'dxn:org.dxos.operation.sandbox.exec' });
