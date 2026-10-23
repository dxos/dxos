//
// Copyright 2026 DXOS.org
//

import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, test } from 'vitest';

import * as CodeIndexMiddleware from './CodeIndexMiddleware.ts';

/** Speaks just enough MCP on stdio: answers `initialize`, and `tools/call` with the call echoed back. */
const FAKE_SERVER = fileURLToPath(new URL('../__fixtures__/fake-mcp-server.mjs', import.meta.url));

describe('CodeIndexMiddleware', () => {
  let url: string;
  let close: () => void;

  beforeAll(async () => {
    const middleware = CodeIndexMiddleware.make({
      root: process.cwd(),
      command: process.execPath,
      args: [FAKE_SERVER],
    });
    const server = createServer((req, res) =>
      middleware(req, res, () => {
        res.statusCode = 404;
        res.end();
      }),
    );
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('server has no port');
    }
    url = `http://127.0.0.1:${address.port}/api/code-index`;
    close = () => {
      middleware.close();
      server.close();
    };
  });

  afterAll(() => close());

  const post = (body: unknown, contentType = 'application/json') =>
    fetch(url, { method: 'POST', headers: { 'content-type': contentType }, body: JSON.stringify(body) });

  test('calls the tool and returns its structured content', async ({ expect }) => {
    const response = await post({ tool: 'query', args: { sparql: 'SELECT * {}' } });
    expect(await response.json()).toEqual({ ok: true, result: { tool: 'query', args: { sparql: 'SELECT * {}' } } });
  });

  test('parses a text-only result as JSON', async ({ expect }) => {
    const response = await post({ tool: 'files' });
    expect(await response.json()).toEqual({ ok: true, result: { files: [], total: 0 } });
  });

  test('reports a tool error without failing the route', async ({ expect }) => {
    const response = await post({ tool: 'ask', args: {} });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: false, error: 'code-index tool "ask" failed: bad sparql' });
  });

  test('refuses unknown tools and non-JSON requests', async ({ expect }) => {
    expect((await post({ tool: 'index' })).status).toBe(400);
    expect((await post({ tool: 'query' }, 'text/plain')).status).toBe(415);
  });
});
