//
// Copyright 2020 DXOS.org
//

import { linkDeferred } from './type-collection';

export * from './database';
export * from './guarded-scope';
export * from './hypergraph';
export * from './object';
export * from './proto';
export * from './query';
export * from './serializer';
export { TypeCollection, TextCompatibilitySchema } from './type-collection';
export * from './util';
export * from './automerge';
export * from './automerge/key-path';

// TODO(dmaretskyi): Until we resolve the circular dependencies lets avoid using "barrel" index.ts files in subdirectories.
export * from './effect/reactive';
export * from './effect/json-schema';
export * from './effect/echo-object-class';
export * from './effect/dynamic/dynamic-schema';
export * from './effect/dynamic/stored-schema';
export { isReactiveProxy } from './effect/proxy';

linkDeferred();
