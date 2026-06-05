//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, Type } from '@dxos/echo';

// TODO(burdon): [API]: extends feels a bit Frankenstein (get review from effect discord).
// TODO(burdon): FQ URIs for type names.
export const Item = Schema.Struct({
  // TODO(burdon): [API]: Make props optional by default?
  done: Schema.optional(Schema.Boolean),
  content: Schema.optional(Schema.String),
  // TODO(burdon): [API]: Are dates supported?
  //  TypeError: Method Date.prototype.toString called on incompatible receiver [object Object]
  // due: S.optional(S.Date),
}).pipe(Type.makeObject(DXN.make('com.example.type.item', '0.1.0')));
export type Item = Type.InstanceType<typeof Item>;

export const Document = Schema.Struct({
  title: Schema.optional(Schema.String),
  content: Schema.optional(Schema.String),
}).pipe(Type.makeObject(DXN.make('com.example.type.document', '0.1.0')));
export type Document = Type.InstanceType<typeof Document>;
