//
// Copyright 2023 DXOS.org
//

import { Module } from '@dxos/protocols/proto/dxos/config';

import { schema } from './gen/schema';

// TODO(burdon): Rename.
export const typeModules: Module[] = schema.types.map((type) => ({
  id: type.name,
  name: type.name,
  type: 'dxos.org/type/schema',
}));
