//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/internal';
import { ItemAnnotation } from '@dxos/schema';

import { ThingSchema } from './Thing';

export const IntangibleSchema = ThingSchema.pipe(Schema.extend(Schema.Struct(ThingSchema.fields)));

/**
 * https://schema.org/Intangible
 * A utility class that serves as the umbrella for a number of 'intangible' things such as quantities, structured values, etc.
 * Intangible extends Thing without adding additional properties.
 */
export const Intangible = IntangibleSchema.pipe(
  Type.Obj({
    typename: 'dxos.org/type/Intangible',
    version: '0.1.0',
  }),
  Schema.annotations({
    title: 'Intangible',
    description: 'A utility class for intangible things such as quantities, structured values, etc.',
  }),
  LabelAnnotation.set(['name', 'alternateName']),
  ItemAnnotation.set(true),
);

export interface Intangible extends Schema.Schema.Type<typeof Intangible> {}

export const make = (props: Partial<Obj.MakeProps<typeof Intangible>> = {}) => Obj.make(Intangible, props);
