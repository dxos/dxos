//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/internal';

import { Provider } from './Provider';

/** A single product listing returned by a provider search. */
export const Result = Schema.Struct({
  title: Schema.String.pipe(Schema.annotations({ title: 'Title' })),
  url: Schema.String.pipe(Schema.annotations({ title: 'URL' })),
  price: Schema.optional(Schema.Number),
  currency: Schema.optional(Schema.String),
  images: Schema.Array(Schema.String),
  provider: Schema.optional(Ref.Ref(Provider)),
  // Stripped key/value metadata.
  properties: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
  fetchedAt: Schema.optional(Schema.String),
}).pipe(
  LabelAnnotation.set(['title']),
  Annotation.IconAnnotation.set({ icon: 'ph--tag--regular', hue: 'cyan' }),
  Type.makeObject(DXN.make('org.dxos.type.productSearchResult', '0.1.0')),
);
export type Result = Type.InstanceType<typeof Result>;

/** Checks if a value is a Result object. */
export const instanceOf = (value: unknown): value is Result => Obj.instanceOf(Result, value);

/** Creates a Result object. */
export const makeResult = (props: Obj.MakeProps<typeof Result>): Result => Obj.make(Result, props);
