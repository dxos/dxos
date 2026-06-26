//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, Format, Type } from '@dxos/echo';

// Eager re-export of `MapPlugin`. See `@dxos/plugin-testing/src/core.ts`
// for the rationale.
export * from './MapPlugin';

export const createLocationSchema = () =>
  Type.makeObject(DXN.make('com.example.type.location', '0.1.0'))(
    Schema.Struct({
      name: Schema.optional(Schema.String).annotations({ title: 'Name' }),
      description: Schema.optional(Schema.String).annotations({ title: 'Description' }),
      location: Schema.optional(Format.GeoPoint).annotations({ title: 'Location' }),
    }),
  );
