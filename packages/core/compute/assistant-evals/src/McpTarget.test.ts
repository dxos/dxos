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

  test('only dev provisions its own identity; a hand-minted token wins wherever it is set', ({ expect }) => {
    const token = process.env.DX_EVAL_MCP_TOKEN;
    try {
      delete process.env.DX_EVAL_MCP_TOKEN;
      expect(McpTarget.mode('local')).to.equal('local');
      expect(McpTarget.mode('dev')).to.equal('provisioned');
      expect(McpTarget.edgeUrl('dev')).to.equal('https://dev.dxos.network');
      // No EDGE a throwaway identity may be registered against, and no form to mint a grant through.
      expect(McpTarget.mode('main')).to.equal('token');
      expect(McpTarget.mode('prod')).to.equal('token');
      expect(McpTarget.edgeUrl('prod')).to.be.undefined;

      // Not even under the override: the grant these targets would need does not exist.
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
