//
// Copyright 2024 DXOS.org
//

export { JsonPath, splitJsonPath, JsonProp } from '@dxos/effect';

// TODO(dmaretskyi): Remove.
export { ObjectId } from '@dxos/keys';
export { ForeignKey } from '@dxos/echo-protocol';

export * from './ast';
export * from './formats';
export * from './json';
export * from './json-schema';
export * from './object';
export * from './query';
export * from './types';
export * from './utils';
export * from './ref';

// TODO(burdon): Fix.
// TODO(dmaretskyi): Omitting barrel export in the mutable directory due to circular deps.
export * from './schema/echo-schema';
export * from './schema/manipulation';
export * from './schema/runtime-schema-registry';
export * from './schema/snapshot';
export * from './schema/stored-schema';
