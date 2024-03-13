//
// Copyright 2020 DXOS.org
//

import { linkDeferred } from './type-collection';

export * from './database';
export * from './hypergraph';
export * from './object';
export * from './proto';
export * from './query';
export * from './serializer';
export { TypeCollection } from './type-collection';
export * from './util';
export * from './automerge';

// TODO(dmaretskyi): Until we resolve the circular dependencies lets avoid using "barrel" index.ts files in subdirectories.
export * from './effect/json-schema';
export * from './effect/reactive';
export { isReactiveProxy } from './effect/proxy';

linkDeferred();
