//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/Annotation';

import { Provider } from './Provider';

/** A single product listing returned by a provider search. */
export class Result extends Type.makeObject<Result>(DXN.make('org.dxos.type.productSearchResult', '0.1.0'))(
  Schema.Struct({
    title: Schema.String.pipe(Schema.annotations({ title: 'Title' })),
    url: Schema.String.pipe(Schema.annotations({ title: 'URL' })),
    images: Schema.Array(Schema.String),
    price: Schema.optional(Schema.Number),
    currency: Schema.optional(Schema.String),
    provider: Schema.optional(Ref.Ref(Provider)),
    // Stripped key/value metadata.
    properties: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
    fetchedAt: Schema.optional(Schema.String),
    // Note: user state (e.g. `starred`) is NOT on the immutable Result — it lives on the Search's tag
    // index keyed by Result id (see Search.STARRED_TAG / Search.setStarred).
  }).pipe(LabelAnnotation.set(['title']), Annotation.IconAnnotation.set({ icon: 'ph--tag--regular', hue: 'cyan' })),
) {}

/** Checks if a value is a Result object. */
export const instanceOf = (value: unknown): value is Result => Obj.instanceOf(Result, value);

/** Creates a Result object. */
export const make = (props: Obj.MakeProps<typeof Result>): Result => Obj.make(Result, props);
