//
// Copyright 2020 DXOS.org
//

import { AutomergeArray, AutomergeDb, AutomergeObject } from './automerge';
import { EchoDatabaseImpl } from './database';
import { EchoLegacyDatabase } from './legacy-database';
import { Expando, TextObject, TypedObject } from './object';
import { linkDeferred } from './type-collection';

export * from './indexing';
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

linkDeferred();

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[EchoDatabaseImpl.name] = EchoDatabaseImpl;
(globalThis as any)[EchoLegacyDatabase.name] = EchoLegacyDatabase;
(globalThis as any)[AutomergeDb.name] = AutomergeDb;
(globalThis as any)[Expando.name] = Expando;
(globalThis as any)[TextObject.name] = TextObject;
(globalThis as any)[TypedObject.name] = TypedObject;
(globalThis as any)[AutomergeArray.name] = AutomergeArray;
(globalThis as any)[AutomergeObject.name] = AutomergeObject;
