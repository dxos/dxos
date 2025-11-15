//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/internal';
import { ItemAnnotation } from '@dxos/schema';

import { IntangibleSchema } from './Intangible';
import { ThingSchema } from './Thing';

export const StructuredValueSchema = IntangibleSchema.pipe(Schema.extend(Schema.Struct(ThingSchema.fields)));

/**
 * https://schema.org/StructuredValue
 * Structured values are used when the value of a property has a more complex structure than simply being a textual value or a reference to another thing.
 * StructuredValue extends Intangible without adding additional properties.
 */
export const StructuredValue = StructuredValueSchema.pipe(
  Type.Obj({
    typename: 'dxos.org/type/StructuredValue',
    version: '0.1.0',
  }),
  Schema.annotations({
    title: 'Structured Value',
    description:
      'Structured values are used when the value of a property has a more complex structure than simply being a textual value or a reference to another thing.',
  }),
  LabelAnnotation.set(['name', 'alternateName']),
  ItemAnnotation.set(true),
);

export interface StructuredValue extends Schema.Schema.Type<typeof StructuredValue> {}

export const make = (props: Partial<Obj.MakeProps<typeof StructuredValue>> = {}) => Obj.make(StructuredValue, props);
