//
// Copyright 2020 DXOS.org
//

export * from './atom-kvs.ts';
export * as DynamicRuntime from './dynamic-runtime.ts';
export * as EffectEx from './EffectEx.ts';
export { type Configuration as OtelConfiguration, layerOtel, makeGlobalTracer, makeTracer } from './otel.ts';
export * as Performance from './Performance.ts';
export * as RuntimeProvider from './RuntimeProvider.ts';
export * as GlobalValue from './internal/GlobalValue.ts';
export * as SchemaAST from './internal/schema-ast.ts';
export * as SchemaEx from './SchemaEx.ts';
export * as SpanAttributes from './SpanAttributes.ts';

// Re-export core types at the top level so TypeScript can name them in declaration files.
// These are the branded string types that appear in public APIs (View fields, JSON schemas).
// The associated schema values live under SchemaEx.JsonPath / SchemaEx.JsonProp.
export type { JsonPath, JsonProp } from './internal/json-path.ts';
