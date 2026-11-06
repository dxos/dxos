//
// Copyright 2026 DXOS.org
//

import { type BlockSchema, type DialectRegistry, parseDialectHeader, resolveBlockSchemas } from '@dxos/deus/schema';

const CORE_DIALECT = 'org.dxos.spec.core';

/** The block kinds a spec text can use: the core dialect's, those of the dialects it and its front matter name, its own. */
export const specSchemas = (
  text: string,
  dialects: readonly string[],
  registry?: DialectRegistry,
): ReadonlyMap<string, BlockSchema> =>
  resolveBlockSchemas(text, {
    dialects: [...new Set([CORE_DIALECT, ...parseDialectHeader(text).extends, ...dialects])],
    registry,
  });
