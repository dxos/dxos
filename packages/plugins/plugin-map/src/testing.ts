//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Format, Type } from '@dxos/echo';

export const createLocationSchema = () =>
  Schema.Struct({
    name: Schema.optional(Schema.String).annotations({ title: 'Name' }),
    description: Schema.optional(Schema.String).annotations({ title: 'Description' }),
    location: Schema.optional(Format.GeoPoint).annotations({ title: 'Location' }),
  }).pipe(Type.Obj({ typename: 'example.com/type/Location', version: '0.1.0' }));
