//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type Endpoint, Endpointer } from './endpoint.ts';
import { WHISTLE_SAMPLE_RATE } from './protocol.ts';

/** A tone at `amplitude`, or near-silent hiss when it is small. */
const signal = (seconds: number, amplitude: number): Float32Array => {
  const samples = new Float32Array(Math.round(seconds * WHISTLE_SAMPLE_RATE));
  for (let index = 0; index < samples.length; index++) {
    samples[index] = amplitude * Math.sin((2 * Math.PI * 220 * index) / WHISTLE_SAMPLE_RATE);
  }
  return samples;
};

/** Feeds `samples` in 128-sample render quanta, as capture does; returns each endpoint and when it fell. */
const feed = (endpointer: Endpointer, samples: Float32Array) => {
  const endpoints: { endpoint: Endpoint; at: number }[] = [];
  for (let start = 0; start < samples.length; start += 128) {
    const endpoint = endpointer.push(samples.subarray(start, start + 128));
    if (endpoint) {
      endpoints.push({ endpoint, at: (start + 128) / WHISTLE_SAMPLE_RATE });
    }
  }
  return endpoints;
};

const concat = (...parts: Float32Array[]) => {
  const result = new Float32Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
};

describe('Endpointer', () => {
  test('ends a request at the pause after it', ({ expect }) => {
    const endpointer = new Endpointer(0.5);
    const endpoints = feed(endpointer, concat(signal(0.4, 0.001), signal(1, 0.3), signal(0.6, 0.001)));
    expect(endpoints).toHaveLength(1);
    expect(endpoints[0].endpoint).toBe('request');
    expect(endpoints[0].at).toBeCloseTo(1.9, 1);
  });

  test('a breath shorter than the pause stays inside the request', ({ expect }) => {
    const endpointer = new Endpointer(0.5);
    const endpoints = feed(endpointer, concat(signal(1, 0.3), signal(0.3, 0.001), signal(1, 0.3)));
    expect(endpoints).toEqual([]);
  });

  test('ends a stream that has heard nothing every second', ({ expect }) => {
    const endpointer = new Endpointer(0.5);
    const endpoints = feed(endpointer, signal(2.5, 0.001));
    expect(endpoints.map(({ endpoint }) => endpoint)).toEqual(['idle', 'idle']);
  });

  test('quiet room tone never opens a stream, however far above its floor', ({ expect }) => {
    const endpointer = new Endpointer(0.5);
    // Peaks of about -40 dBFS over a floor near -80, like the whistle-silence fixture.
    feed(endpointer, concat(signal(0.3, 0.0001), signal(0.7, 0.01)));
    expect(endpointer.heard).toBe(false);
    feed(endpointer, signal(0.3, 0.3));
    expect(endpointer.heard).toBe(true);
  });

  test('a click is not a request', ({ expect }) => {
    const endpointer = new Endpointer(0.5);
    const endpoints = feed(endpointer, concat(signal(0.5, 0.001), signal(0.05, 0.3), signal(0.6, 0.001)));
    expect(endpoints.map(({ endpoint }) => endpoint)).not.toContain('request');
  });
});
