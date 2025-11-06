//
// Copyright 2021 DXOS.org
//

// TODO(burdon): Why is this exported? (Rename).
export * as defs from '@dxos/protocols/proto/dxos/config';

export { type Config as ConfigProto } from '@dxos/protocols/proto/dxos/config';

export * from './config';
export * from './loaders';
export * from './savers';
export * from './plugin';
export * from './types';
export * from './preset';