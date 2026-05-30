//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';

import { Provider } from './Provider';
import { Result } from './Result';

/** A user's saved product search configuration. */
export const Search = Schema.Struct({
  name: Schema.String.pipe(Schema.annotations({ title: 'Name' })),
  providers: Schema.Array(Ref.Ref(Provider)),
  // Values for the union of provider fields, keyed by field name.
  criteria: Schema.Record({ key: Schema.String, value: Schema.Unknown }).pipe(FormInputAnnotation.set(false)),
  results: Schema.Array(Ref.Ref(Result)).pipe(FormInputAnnotation.set(false)),
  status: Schema.optional(Schema.Literal('idle', 'running', 'error')),
  lastRunAt: Schema.optional(Schema.String),
}).pipe(
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({ icon: 'ph--shopping-cart--regular', hue: 'cyan' }),
  Type.makeObject(DXN.make('org.dxos.type.productSearch', '0.1.0')),
);
export type Search = Type.InstanceType<typeof Search>;

/** Checks if a value is a Search object. */
export const instanceOf = (value: unknown): value is Search => Obj.instanceOf(Search, value);

/** Creates a Search with providers, criteria, and results defaulting to empty. */
export const makeSearch = (
  props: Omit<Obj.MakeProps<typeof Search>, 'providers' | 'criteria' | 'results'> & {
    providers?: Ref.Ref<Provider>[];
    criteria?: Record<string, unknown>;
    results?: Ref.Ref<Result>[];
  },
): Search =>
  Obj.make(Search, {
    ...props,
    providers: props.providers ?? [],
    criteria: props.criteria ?? {},
    results: props.results ?? [],
  });
