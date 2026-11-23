//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test, vi } from 'vitest';

import { MixerEngine } from './mixer.ts';

/** Records the AudioParam calls the engine makes on the master gain. */
const makeFakeGain = () => ({
  gain: { value: 1, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
  connect: vi.fn(),
  disconnect: vi.fn(),
});

/** Minimal AudioContext stand-in: node has no Web Audio API. */
class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  readonly currentTime = 12;
  readonly destination = {};
  readonly gains: ReturnType<typeof makeFakeGain>[] = [];
  readonly close = vi.fn(async () => {});

  constructor() {
    FakeAudioContext.instances.push(this);
  }

  createGain() {
    const gain = makeFakeGain();
    this.gains.push(gain);
    return gain;
  }
}

describe('MixerEngine', () => {
  beforeEach(() => {
    FakeAudioContext.instances = [];
    vi.stubGlobal('AudioContext', FakeAudioContext);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('F-6.1: fadeOut ramps the master gain linearly to zero over the given seconds', async ({ expect }) => {
    const engine = new MixerEngine();
    await engine.play([]);
    const [context] = FakeAudioContext.instances;
    const [master] = context.gains;

    engine.fadeOut(30);
    expect(master.gain.setValueAtTime).toHaveBeenCalledWith(1, 12);
    expect(master.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 42);

    await engine.stop();
  });

  test('F-6.2: stop closes the context at once and schedules no fade', async ({ expect }) => {
    const engine = new MixerEngine();
    await engine.play([]);
    const [context] = FakeAudioContext.instances;
    const [master] = context.gains;

    await engine.stop();
    expect(master.gain.linearRampToValueAtTime).not.toHaveBeenCalled();
    expect(master.disconnect).toHaveBeenCalled();
    expect(context.close).toHaveBeenCalledTimes(1);
    expect(engine.playing).toBe(false);
  });
});
