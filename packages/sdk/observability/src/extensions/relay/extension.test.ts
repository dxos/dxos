//
// Copyright 2026 DXOS.org
//

import { describe, expect, test, vi } from 'vitest';

import { EffectEx } from '@dxos/effect';

import type * as ObservabilityExtension from '../../ObservabilityExtension';
import { type Envelope, isEnvelope } from './envelope';
import { extensions } from './extension';

const setup = async (overrides: Partial<Parameters<typeof extensions>[0]> = {}) => {
  const published: Envelope[] = [];
  const extension = await EffectEx.runPromise(
    extensions({
      publish: (envelope) => {
        published.push(envelope);
      },
      release: 'edge@1',
      environment: 'test',
      now: () => 1_000,
      ...overrides,
    }),
  );
  const api = <K extends ObservabilityExtension.Kind>(kind: K) =>
    extension.apis.find((candidate): candidate is Extract<ObservabilityExtension.ExtensionApi, { kind: K }> => {
      return candidate.kind === kind;
    })!;
  return { published, extension, api };
};

describe('Relay extension', () => {
  test('wraps an event in an envelope carrying the super properties and capture time', async () => {
    const { published, api } = await setup({ distinctId: 'did:test' });
    api('events').captureEvent('page.load', { loadDuration: 12 });

    expect(published).toEqual([
      {
        v: 1,
        timestamp: 1_000,
        distinctId: 'did:test',
        tags: { release: 'edge@1', environment: 'test' },
        kind: 'event',
        event: 'page.load',
        properties: { loadDuration: 12 },
      },
    ]);
    expect(isEnvelope(published[0])).toBe(true);
  });

  test('setTags and identify are reflected on the records that follow', async () => {
    const { published, extension, api } = await setup();
    extension.setTags!({ appPlatform: 'edge' });
    extension.identify!('did:one', { plan: 'pro' }, { firstSeen: 'today' });
    api('events').captureEvent('op');

    expect(published.map((envelope) => envelope.kind)).toEqual(['identify', 'event']);
    expect(published[0]).toMatchObject({
      kind: 'identify',
      distinctId: 'did:one',
      properties: { plan: 'pro' },
      setOnce: { firstSeen: 'today' },
    });
    expect(published[1]).toMatchObject({ distinctId: 'did:one', tags: { appPlatform: 'edge', release: 'edge@1' } });
  });

  test('alias records the previous id and switches attribution', async () => {
    const { published, extension, api } = await setup({ distinctId: 'install-1' });
    extension.alias!('did:one');
    api('events').captureEvent('op');

    expect(published[0]).toMatchObject({ kind: 'alias', distinctId: 'did:one', previousId: 'install-1' });
    expect(published[1]).toMatchObject({ kind: 'event', distinctId: 'did:one' });
  });

  test('serializes an exception so it survives a channel', async () => {
    const { published, api } = await setup();
    const error = new TypeError('boom');
    api('errors').captureException(error, { where: 'handler' });

    expect(published[0]).toMatchObject({
      kind: 'exception',
      error: { name: 'TypeError', message: 'boom', stack: error.stack },
      properties: { where: 'handler' },
    });
  });

  test('forwards AI and MCP records under their own kinds', async () => {
    const { published, api } = await setup();
    const base = { traceId: 't', spanId: 's', spanName: 'n', latency: 1 };
    api('ai').captureInference({ ...base, streaming: false });
    api('ai').captureTurn(base);
    api('ai').captureToolCall(base);
    api('mcp').captureInitialize({ sessionId: 'session' });
    api('mcp').captureToolCall({ sessionId: 'session', toolName: 'tool', durationMs: 3, isError: false });

    expect(published.map((envelope) => envelope.kind)).toEqual([
      'ai.inference',
      'ai.turn',
      'ai.toolCall',
      'mcp.initialize',
      'mcp.toolCall',
    ]);
  });

  test('publishes nothing while disabled', async () => {
    const { published, extension, api } = await setup();
    await EffectEx.runPromise(extension.disable!());
    api('events').captureEvent('dropped');
    expect(extension.enabled).toBe(false);
    expect(published).toEqual([]);

    await EffectEx.runPromise(extension.enable!());
    api('events').captureEvent('kept');
    expect(published.map((envelope) => envelope.kind)).toEqual(['event']);
  });

  test('a relay that throws does not fail the capture call', async () => {
    const { api } = await setup({
      publish: () => {
        throw new Error('channel closed');
      },
    });
    expect(() => api('events').captureEvent('op')).not.toThrow();
  });

  test('a relay whose promise rejects does not surface an unhandled rejection', async () => {
    const { api } = await setup({ publish: () => Promise.reject(new Error('channel closed')) });
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    try {
      api('events').captureEvent('op');
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off('unhandledRejection', unhandled);
    }
  });

  test('isEnvelope rejects other channel traffic and malformed records', () => {
    expect(isEnvelope({ v: 1, timestamp: 1, tags: {}, kind: 'nope' })).toBe(false);
    expect(isEnvelope({ v: 2, timestamp: 1, tags: {}, kind: 'event', event: 'op' })).toBe(false);
    expect(isEnvelope('{"kind":"event"}')).toBe(false);
    // Right kind, wrong shape: no event name, and a tag that is not a string.
    expect(isEnvelope({ v: 1, timestamp: 1, tags: {}, kind: 'event' })).toBe(false);
    expect(isEnvelope({ v: 1, timestamp: 1, tags: { release: 1 }, kind: 'event', event: 'op' })).toBe(false);
    expect(isEnvelope({ v: 1, timestamp: 1, tags: {}, kind: 'exception', error: { name: 'E' } })).toBe(false);
    expect(isEnvelope({ v: 1, timestamp: 1, distinctId: 7, tags: {}, kind: 'event', event: 'op' })).toBe(false);
  });

  test('every envelope the extension publishes passes its own schema', async () => {
    const { published, extension, api } = await setup({ distinctId: 'install-1' });
    extension.identify!('did:one', { plan: 'pro' });
    extension.alias!('did:two');
    api('events').captureEvent('op', { nested: { deep: true } });
    api('errors').captureException(new Error('boom'));
    const base = { traceId: 't', spanId: 's', spanName: 'n', latency: 1 };
    api('ai').captureInference({ ...base, streaming: true, content: { input: [{ role: 'user' }], truncated: false } });
    api('ai').captureTurn({ ...base, content: { output: 'x' } });
    api('ai').captureToolCall(base);
    api('mcp').captureInitialize({ sessionId: 'session', clientName: 'c' });
    api('mcp').captureToolCall({ sessionId: 'session', toolName: 'tool', durationMs: 3, isError: false });

    expect(published).toHaveLength(9);
    for (const envelope of published) {
      expect(isEnvelope(envelope)).toBe(true);
    }
  });
});
