//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as McpLatency from './McpLatency.ts';

describe('McpLatency.stats', () => {
  test('nearest-rank percentiles over the samples a run actually has', ({ expect }) => {
    expect(McpLatency.stats(samples(10, 20, 30, 40, 100))).to.deep.equal({
      count: 5,
      errors: 0,
      min: 10,
      mean: 40,
      p50: 30,
      p95: 100,
      max: 100,
    });
  });

  test('an errored call is still a sample, so a dead endpoint reports as errors rather than as nothing', ({
    expect,
  }) => {
    const stats = McpLatency.stats([...samples(10), { tool: 'loadSkill', millis: 30, isError: true }]);
    expect(stats.count).to.equal(2);
    expect(stats.errors).to.equal(1);
  });
});

describe('McpLatency.probe', () => {
  test('a host that refuses the connection comes back as a failing report, not a thrown probe', async ({ expect }) => {
    // Port 1 on the loopback: nothing listens there, so `connect` rejects before a single tool call.
    const report = await McpLatency.probe({
      target: 'local',
      url: 'http://127.0.0.1:1/mcp',
      probes: [{ tool: 'queryOperations' }, { tool: 'loadSkill' }],
      iterations: 1,
      warmup: 0,
    });

    expect(report.stats['*'].errors).to.equal(2);
    expect(report.samples.every((sample) => sample.isError)).to.be.true;
  });
});

const samples = (...millis: number[]): McpLatency.Sample[] =>
  millis.map((value) => ({ tool: 'queryOperations', millis: value, isError: false }));
