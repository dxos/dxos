//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { TOOL_METADATA } from './metadata';

// Top-level field key each tool's outputSchema must expose. MCP requires
// `structuredContent` to be a JSON object, so every tool wraps its
// result(s) under a stable key — this is the contract downstream
// consumers (e.g. dxos/edge introspect-service) bind to.
const EXPECTED_OUTPUT_KEYS: Record<string, string> = {
  list_packages: 'packages',
  get_package: 'package',
  list_symbols: 'symbols',
  find_symbol: 'matches',
  get_symbol: 'symbol',
  list_plugins: 'plugins',
  list_surfaces: 'surfaces',
  list_capabilities: 'capabilities',
  list_operations: 'operations',
  list_schemas: 'schemas',
  list_idioms: 'idioms',
};

describe('TOOL_METADATA', () => {
  test('every entry declares title, description, inputSchema, outputSchema', ({ expect }) => {
    for (const [name, meta] of Object.entries(TOOL_METADATA)) {
      expect(meta.title, `${name}.title`).toBeTypeOf('string');
      expect(meta.description, `${name}.description`).toBeTypeOf('string');
      expect(meta.inputSchema, `${name}.inputSchema`).toBeDefined();
      expect(meta.inputSchema.fields, `${name}.inputSchema.fields`).toBeDefined();
      expect(meta.outputSchema, `${name}.outputSchema`).toBeDefined();
      expect(meta.outputSchema.fields, `${name}.outputSchema.fields`).toBeDefined();
    }
  });

  test('outputSchema top-level key matches the documented convention', ({ expect }) => {
    for (const [name, expectedKey] of Object.entries(EXPECTED_OUTPUT_KEYS)) {
      const meta = TOOL_METADATA[name];
      expect(meta, `tool ${name} missing from TOOL_METADATA`).toBeDefined();
      const keys = Object.keys(meta.outputSchema.fields);
      expect(keys, `${name}.outputSchema fields`).toEqual([expectedKey]);
    }
  });

  test('all registered tools have an expected output key entry', ({ expect }) => {
    // Catches new tools added to TOOL_METADATA without a corresponding
    // documented output-key convention.
    for (const name of Object.keys(TOOL_METADATA)) {
      expect(EXPECTED_OUTPUT_KEYS[name], `tool ${name} missing from EXPECTED_OUTPUT_KEYS`).toBeDefined();
    }
  });
});
