//
// Copyright 2026 DXOS.org
//

import { describe, expect, test, vi } from 'vitest';

import type * as Observability from '../../Observability';
import { type Envelope, type Payload } from './envelope';
import { currentDistinctId, replay } from './replay';

const envelope = (payload: Payload & { distinctId?: string }, tags: Record<string, string> = {}): Envelope => ({
  v: 1,
  timestamp: 1,
  tags,
  ...payload,
});

const makeFacade = () => {
  const seen: string[] = [];
  const observe =
    (name: string) =>
    (...args: unknown[]) => {
      seen.push(`${name}:${currentDistinctId() ?? '-'}`);
      return args;
    };
  const facade = {
    identify: vi.fn(observe('identify')),
    alias: vi.fn(observe('alias')),
    events: { captureEvent: vi.fn(observe('event')) },
    errors: { captureException: vi.fn(observe('exception')) },
    ai: {
      captureInference: vi.fn(observe('inference')),
      captureTurn: vi.fn(observe('turn')),
      captureToolCall: vi.fn(observe('toolCall')),
    },
    mcp: { captureInitialize: vi.fn(observe('mcp.init')), captureToolCall: vi.fn(observe('mcp.call')) },
  } as unknown as Observability.Observability;
  return { facade, seen };
};

describe('Relay.replay', () => {
  test("the record's person is ambient for exactly its own calls", () => {
    const { facade, seen } = makeFacade();
    replay(facade, envelope({ kind: 'event', event: 'op', distinctId: 'did:one' }));
    replay(facade, envelope({ kind: 'event', event: 'op' }));
    expect(seen).toEqual(['event:did:one', 'event:-']);
    expect(currentDistinctId()).toBeUndefined();
  });

  test('an event carries the producer super properties as properties', () => {
    const { facade } = makeFacade();
    replay(facade, envelope({ kind: 'event', event: 'op', properties: { n: 1 } }, { release: 'edge@1' }));
    expect(facade.events.captureEvent).toHaveBeenCalledWith('op', { release: 'edge@1', n: 1 });
  });

  test('an exception is rebuilt as an Error with its name and stack', () => {
    const { facade } = makeFacade();
    replay(
      facade,
      envelope({ kind: 'exception', error: { name: 'TypeError', message: 'boom', stack: 'TypeError: boom\n  at x' } }),
    );
    const [error, properties] = vi.mocked(facade.errors.captureException).mock.calls[0];
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('TypeError');
    expect(error.message).toBe('boom');
    expect(error.stack).toBe('TypeError: boom\n  at x');
    expect(properties).toEqual({});
  });

  test('identify and alias need a person and pass it through', () => {
    const { facade } = makeFacade();
    replay(facade, envelope({ kind: 'identify', properties: { plan: 'pro' } }));
    replay(facade, envelope({ kind: 'identify', distinctId: 'did:one', properties: { plan: 'pro' } }));
    replay(facade, envelope({ kind: 'alias', distinctId: 'did:one', previousId: 'install-1' }));
    expect(facade.identify).toHaveBeenCalledTimes(1);
    expect(facade.identify).toHaveBeenCalledWith('did:one', { plan: 'pro' }, undefined);
    expect(facade.alias).toHaveBeenCalledWith('did:one', 'install-1');
  });

  test('AI and MCP records reach their kinds', () => {
    const { facade, seen } = makeFacade();
    const base = { traceId: 't', spanId: 's', spanName: 'n', latency: 1 };
    replay(facade, envelope({ kind: 'ai.inference', inference: { ...base, streaming: false }, distinctId: 'did:one' }));
    replay(facade, envelope({ kind: 'ai.turn', turn: base }));
    replay(facade, envelope({ kind: 'ai.toolCall', toolCall: base }));
    replay(facade, envelope({ kind: 'mcp.initialize', session: { sessionId: 's' } }));
    replay(
      facade,
      envelope({ kind: 'mcp.toolCall', call: { sessionId: 's', toolName: 't', durationMs: 1, isError: false } }),
    );
    expect(seen).toEqual(['inference:did:one', 'turn:-', 'toolCall:-', 'mcp.init:-', 'mcp.call:-']);
  });
});
