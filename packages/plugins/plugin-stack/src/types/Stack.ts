//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Type } from '@dxos/echo';

// TODO(burdon): Placeholder.
export const Stack = Schema.Struct({}).pipe(Type.makeObject(DXN.make('org.dxos.type.stack', '0.1.0')));

export type Stack = Type.InstanceType<typeof Stack>;
