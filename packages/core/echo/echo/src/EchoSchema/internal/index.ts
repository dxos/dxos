//
// Copyright 2024 DXOS.org
//

export { JsonPath, splitJsonPath, JsonProp } from '@dxos/effect';

// TODO(dmaretskyi): Remove.
// export { ObjectId } from '@dxos/keys';
// export { ForeignKey } from '@dxos/echo-protocol';
// export { defineHiddenProperty } from '@dxos/live-object';

export * from './object';
// TODO(dmaretskyi): Remove
export { live } from './proxy/reactive-object';
export * from './schema';
