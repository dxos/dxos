//
// Copyright 2020 DXOS.org
//

export * from './automerge';
export * from './automerge/key-path';
export * from './database';
export * from './guarded-scope';
export * from './hypergraph';
export * from './object';
export * from './query';
export * from './serializer';
export { RuntimeSchemaRegistry } from './runtime-schema-registry';
export * from './util';

// TODO(dmaretskyi): Until we resolve the circular dependencies lets avoid using "barrel" index.ts files in subdirectories.
export * from './effect/dynamic/dynamic-schema';
export * from './effect/dynamic/stored-schema';
export { createEchoObject } from './effect/echo-handler';
export * from './effect/echo-object-class';
export * from './effect/json-schema';
export { isReactiveProxy } from './effect/proxy';
export * from './effect/reactive';
export { SchemaValidator } from './effect/schema-validator';
export * from './text';

export * as S from '@effect/schema/Schema';
export * as AST from '@effect/schema/AST';

// This comment is here to bust NX cache. Remove it after the code changes.
