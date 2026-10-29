//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ScriptedProvider } from './providers/index.ts';
import { SignalBus } from './signals.ts';

describe('signals', () => {
  test('the bus merges slices and drains events once', ({ expect }) => {
    const bus = new SignalBus();
    bus.set('state', { phase: 'thinking' });
    bus.set('room', { speaking: 2 });
    bus.emit({ type: 'addressed', at: 1 });
    expect(bus.read().state).toEqual({ phase: 'thinking', addressed: false });
    expect(bus.read().room.speaking).toBe(2);
    expect(bus.drain()).toEqual([{ type: 'addressed', at: 1 }]);
    expect(bus.drain()).toEqual([]);
  });

  test('a script runs each step once its time has passed, in time order', ({ expect }) => {
    const bus = new SignalBus();
    const provider = new ScriptedProvider([
      { at: 2, run: (sink) => sink.set('state', { phase: 'speaking' }) },
      { at: 1, run: (sink) => sink.set('state', { phase: 'thinking' }) },
    ]);
    const stop = provider.start(bus);
    provider.sample({ time: 0.5, delta: 0.5 });
    expect(bus.read().state.phase).toBe('idle');
    provider.sample({ time: 1.5, delta: 1 });
    expect(bus.read().state.phase).toBe('thinking');
    provider.sample({ time: 3, delta: 1.5 });
    expect(bus.read().state.phase).toBe('speaking');
    stop();
  });
});
