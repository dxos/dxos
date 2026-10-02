//
// Copyright 2026 DXOS.org
//

export * as GlobalValue from './GlobalValue.ts';
export * as SchemaAST from './schema-ast.ts';

// Re-export core types at the top level so TypeScript can name them in declaration files.
// These are the branded string types that appear in public APIs (View fields, JSON schemas).
// The associated schema values live under SchemaEx.JsonPath / SchemaEx.JsonProp.
export type { JsonPath, JsonProp } from './json-path.ts';
