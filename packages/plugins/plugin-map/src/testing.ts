//
// Copyright 2025 DXOS.org

import { Schema } from 'effect';

import { Type } from '@dxos/echo';
import { PublicKey } from '@dxos/react-client';

export const createLocationSchema = () =>
  Schema.Struct({
    name: Schema.optional(Schema.String).annotations({ title: 'Name' }),
    description: Schema.optional(Schema.String).annotations({ title: 'Description' }),
    location: Schema.optional(Type.Format.GeoPoint).annotations({ title: 'Location' }),
  }).pipe(Type.Obj({ typename: `example.com/type/${PublicKey.random().truncate()}`, version: '0.1.0' }));
