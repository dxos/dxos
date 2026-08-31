//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, Format, Type } from '@dxos/echo';

// Eager re-export of `MapPlugin`. See `@dxos/plugin-testing/src/core.ts`
// for the rationale.
export * from '#plugin';

export const createLocationSchema = () =>
  Type.makeObject(DXN.make('com.example.type.location', '0.1.0'))(
    Schema.Struct({
      name: Schema.optional(Schema.String).annotate({ title: 'Name' }),
      description: Schema.optional(Schema.String).annotate({ title: 'Description' }),
      location: Schema.optional(Format.GeoPoint).annotate({ title: 'Location' }),
    }),
  );
