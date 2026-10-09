//
// Copyright 2021 DXOS.org
//

// TODO(burdon): Why is this exported? (Rename).
export * as defs from '@dxos/protocols/buf/dxos/config_pb';

export { type Config as ConfigProto } from '@dxos/protocols/buf/dxos/config_pb';

export * from './config.ts';
export * from './config-service.ts';
export * from './edge-services.ts';
export * from '#loaders';
export * from '#savers';
export * from '#plugin';
export * from './telemetry.ts';
export * from './types.ts';
export * from './preset.ts';
