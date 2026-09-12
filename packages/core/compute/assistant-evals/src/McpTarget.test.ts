//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as McpLatency from './McpLatency.ts';
import * as McpTarget from './McpTarget.ts';

describe('McpTarget', () => {
  test('defaults to the in-process host, which has no endpoint of its own', ({ expect }) => {
    expect(McpTarget.fromEnv(undefined)).to.equal('local');
    expect(McpTarget.fromEnv('')).to.equal('local');
    expect(McpTarget.isLocal(McpTarget.fromEnv(undefined))).to.be.true;
    expect(McpTarget.url('local')).to.be.undefined;
  });

  test('resolves the deployed environments and their aliases', ({ expect }) => {
    expect(McpTarget.fromEnv('DEV')).to.equal('dev');
    expect(McpTarget.fromEnv('preview')).to.equal('main');
    expect(McpTarget.fromEnv('production')).to.equal('prod');
    expect(McpTarget.url('dev')).to.equal('https://mcp.dev.dxos.network/mcp');
    expect(McpTarget.url('main')).to.equal('https://mcp.preview.dxos.network/mcp');
    expect(McpTarget.url('prod')).to.equal('https://mcp.dxos.network/mcp');
  });

  test('an unknown target fails rather than falling back to a surface nobody asked for', ({ expect }) => {
    expect(() => McpTarget.fromEnv('staging')).to.throw(/Unknown MCP eval target/);
  });
});

describe('McpLatency.stats', () => {
  const samples = (...millis: number[]): McpLatency.Sample[] =>
    millis.map((value) => ({ tool: 'queryOperations', millis: value, isError: false }));

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
