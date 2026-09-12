//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

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
