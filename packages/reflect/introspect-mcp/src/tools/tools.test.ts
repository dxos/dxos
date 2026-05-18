//
// Copyright 2026 DXOS.org
//

// Verifies the `@dxos/introspect-mcp/tools` subpath export resolves and
// produces the expected tool surface without dragging in the stdio/HTTP
// server. A separate consumer (e.g. plugin-assistant) embedding these tools
// in a different MCP runtime should be able to import only this entry point.
//
// The test deliberately imports via the package name (not relative paths) so
// it fails if the `exports['./tools']` field in package.json regresses.

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'vitest';

import { createIntrospector } from '@dxos/introspect';
import { createToolDefinitions, noopLogger } from '@dxos/introspect-mcp/tools';

const __dirname = dirname(fileURLToPath(import.meta.url));
// `<this file>/../../../introspect/src/__fixtures__`. Reused so the
// subpath import test sees the same fixture set as the rest of the suite.
const FIXTURE_ROOT = join(__dirname, '..', '..', '..', 'introspect', 'src', '__fixtures__');

// CI runners are slower than local; ts-morph indexing the 2-package fixture
// takes ~4s on the GitHub runner, blowing past vitest's 5s default. Bump
// the per-test timeout for both tests in this suite.
describe('@dxos/introspect-mcp/tools subpath export', { timeout: 30_000 }, () => {
  test('createToolDefinitions returns the full tool map', async ({ expect }) => {
    const introspector = createIntrospector({ rootPath: FIXTURE_ROOT, cache: false });
    await introspector.ready;
    try {
      const definitions = createToolDefinitions(introspector, noopLogger);
      const names = Object.keys(definitions).sort();
      expect(names).toEqual([
        'find_symbol',
        'get_package',
        'get_symbol',
        'list_capabilities',
        'list_idioms',
        'list_operations',
        'list_packages',
        'list_plugins',
        'list_schemas',
        'list_surfaces',
        'list_symbols',
      ]);
      // Every entry must carry the metadata MCP wants from a tool definition.
      // `inputSchema` is an Effect `Schema.Struct(...)` (which is callable —
      // hence `function` typeof) carrying a `.fields` record. The server
      // converts it to zod via `inputSchemaToZod` at registration time.
      for (const def of Object.values(definitions)) {
        expect(typeof def.title).toBe('string');
        expect(typeof def.description).toBe('string');
        expect(def.inputSchema).toBeDefined();
        expect(typeof (def.inputSchema as { fields?: unknown }).fields).toBe('object');
        expect(typeof def.handler).toBe('function');
      }
    } finally {
      introspector.dispose();
    }
  });

  test('handlers run end-to-end without the MCP server wiring', async ({ expect }) => {
    // Embedding scenario: a different runtime calls a handler directly,
    // bypassing the readiness gate / MCP envelope. We await `ready` here on
    // behalf of that runtime so the handler sees a populated index.
    const introspector = createIntrospector({ rootPath: FIXTURE_ROOT, cache: false });
    await introspector.ready;
    try {
      const { list_packages } = createToolDefinitions(introspector, noopLogger);
      const result = await list_packages.handler({});
      const data = result.data as Array<{ name: string }>;
      expect(data.some((p) => p.name === '@fixture/pkg-a')).toBe(true);
    } finally {
      introspector.dispose();
    }
  });
});
