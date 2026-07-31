//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, Type } from '@dxos/echo';

// TODO(burdon): FQ URIs for type names.
export class Item extends Type.makeObject<Item>(DXN.make('com.example.type.item', '0.1.0'))(
  Schema.Struct({
    // TODO(burdon): Make props optional by default?
    done: Schema.optional(Schema.Boolean),
    content: Schema.optional(Schema.String),
    // TODO(burdon): Are dates supported?
    //  TypeError: Method Date.prototype.toString called on incompatible receiver [object Object]
    // due: S.optional(S.Date),
  }),
) {}

export class Document extends Type.makeObject<Document>(DXN.make('com.example.type.document', '0.1.0'))(
  Schema.Struct({
    title: Schema.optional(Schema.String),
    content: Schema.optional(Schema.String),
  }),
) {}
