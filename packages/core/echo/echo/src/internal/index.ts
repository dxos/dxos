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
export * from './types';
export { defineHiddenProperty } from '@dxos/live-object';
export * from './ref';
export * from './projection';
export * from './schema';
// TODO(dmaretskyi): Remove
export { live } from './proxy/reactive-object';
