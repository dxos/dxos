//
// Copyright 2026 DXOS.org
//

import {
  type BlockSchema,
  type DialectRegistry,
  STANDARD_DIALECTS,
  parseDialectHeader,
  resolveBlockSchemas,
  scanBlocks,
} from '@dxos/deus/schema';

const CORE_DIALECT = 'org.dxos.spec.core';

/** Resolved schemas per registry, by what they were resolved from; the oldest entry goes past the limit. */
const cache = new WeakMap<DialectRegistry, Map<string, ReadonlyMap<string, BlockSchema>>>();
const LIMIT = 32;

/** What a spec's schemas depend on: its dialects, its front matter and its own `ext` blocks. */
const schemaSource = (text: string, dialects: readonly string[]) =>
  [
    dialects.join(','),
    text.match(/^---\n[\s\S]*?\n---/)?.[0] ?? '',
    ...scanBlocks(text)
      .map(({ from, to }) => text.slice(from, to))
      .filter((block) => /^\s*ext\b/.test(block)),
  ].join('\0');

/**
 * The block kinds a spec text can use: the core dialect's, those of the dialects it and its front matter name, its own.
 * The same map comes back while what it depends on is unchanged.
 */
export const specSchemas = (
  text: string,
  dialects: readonly string[],
  registry: DialectRegistry = STANDARD_DIALECTS,
): ReadonlyMap<string, BlockSchema> => {
  const source = schemaSource(text, dialects);
  const resolved = cache.get(registry) ?? new Map<string, ReadonlyMap<string, BlockSchema>>();
  cache.set(registry, resolved);
  const cached = resolved.get(source);
  if (cached) {
    return cached;
  }
  const schemas = resolveBlockSchemas(text, {
    dialects: [...new Set([CORE_DIALECT, ...parseDialectHeader(text).extends, ...dialects])],
    registry,
  });
  resolved.set(source, schemas);
  if (resolved.size > LIMIT) {
    resolved.delete(resolved.keys().next().value!);
  }
  return schemas;
};
