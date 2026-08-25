//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Config2 } from '@dxos/protocols';

/**
 * JSON Schema (draft 2020-12) for `dxplugin.jsonc`, derived from {@link Config2.Descriptor}.
 *
 * A descriptor is hand-authored, so the schema is what makes it writable: an editor pointed at it
 * completes module fields, capability reference shapes and activation forms in place. Derived from
 * the runtime schema rather than written twice, so the two cannot drift — `dxplugin.schema.json`
 * at the package root is this value, checked in and drift-tested so editors have a plain file to
 * resolve without running any code.
 */
export const descriptorJsonSchema = (): Record<string, unknown> => {
  // `toJsonSchemaDocument` returns a document — dialect, schema and definitions as siblings — while
  // an editor wants one schema object with the dialect as `$schema` and the definitions under
  // `$defs`, so the document is flattened here rather than at every consumer.
  const { schema, definitions } = Schema.toJsonSchemaDocument(Config2.Descriptor);
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'DXOS plugin descriptor',
    ...schema,
    ...(definitions && Object.keys(definitions).length > 0 ? { $defs: definitions } : {}),
  };
};

/** Basename of the checked-in schema at this package's root. */
export const DXPLUGIN_SCHEMA_FILENAME = 'dxplugin.schema.json';

/**
 * Path a plugin package's `dxplugin.jsonc` sets as its `$schema`.
 *
 * A workspace-relative path into `node_modules` rather than a URL: it resolves offline, in every
 * editor, and always to the schema the installed `@dxos/app-framework` actually validates against —
 * a hosted URL would drift from the SDK a given checkout is on.
 */
export const DXPLUGIN_SCHEMA_PATH = `../../../node_modules/@dxos/app-framework/${DXPLUGIN_SCHEMA_FILENAME}`;
