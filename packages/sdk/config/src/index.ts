//
// Copyright 2021 DXOS.org
//

export * from './config';
export * from './loaders/index';
export { ConfigObject, ConfigV1Object } from './sanitizer';
export * as defs from './proto/gen/dxos/config'; // TODO(burdon): Rename config?
