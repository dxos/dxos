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

  test('the open-hatch targets provision their own identity; a hand-minted token wins wherever it is set', ({
    expect,
  }) => {
    const token = process.env.DX_EVAL_MCP_TOKEN;
    try {
      delete process.env.DX_EVAL_MCP_TOKEN;
      expect(McpTarget.mode('local')).to.equal('local');
      // Both environments edge's `isTestAccountEnvironment` admits a `test+*@dxos.org` bind on.
      expect(McpTarget.mode('dev')).to.equal('provisioned');
      expect(McpTarget.edgeUrl('dev')).to.equal('https://dev.dxos.network');
      expect(McpTarget.mode('main')).to.equal('provisioned');
      expect(McpTarget.edgeUrl('main')).to.equal('https://preview.dxos.network');
      // Production's hatch is closed by design, so no throwaway identity can be bound there.
      expect(McpTarget.mode('prod')).to.equal('token');
      expect(McpTarget.edgeUrl('prod')).to.be.undefined;

      // Not even under the override: the grant a closed-hatch target would need does not exist.
      process.env.DX_EVAL_EDGE_URL = 'https://edge.example';
      try {
        expect(McpTarget.edgeUrl('prod')).to.be.undefined;
        expect(McpTarget.mode('prod')).to.equal('token');
        expect(McpTarget.mode('local-edge')).to.equal('token');
        expect(McpTarget.edgeUrl('dev')).to.equal('https://edge.example');
      } finally {
        delete process.env.DX_EVAL_EDGE_URL;
      }

      process.env.DX_EVAL_MCP_TOKEN = 'minted-by-hand';
      expect(McpTarget.mode('dev')).to.equal('token');
      expect(McpTarget.headers('dev')).to.deep.equal({ Authorization: 'Bearer minted-by-hand' });
    } finally {
      if (token == null) {
        delete process.env.DX_EVAL_MCP_TOKEN;
      } else {
        process.env.DX_EVAL_MCP_TOKEN = token;
      }
    }
  });

  test('a minted grant is carried the same way a hand-minted one is', ({ expect }) => {
    expect(McpTarget.headers('dev', 'minted-by-the-run')).to.deep.equal({ Authorization: 'Bearer minted-by-the-run' });
    expect(McpTarget.headers('local', 'ignored')).to.be.undefined;
  });
});
