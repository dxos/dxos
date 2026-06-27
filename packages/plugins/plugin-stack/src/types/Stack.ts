//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Type } from '@dxos/echo';

// TODO(burdon): Placeholder.
export class Stack extends Type.makeObject<Stack>(DXN.make('org.dxos.type.stack', '0.1.0'))(Schema.Struct({})) {}
