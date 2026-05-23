//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN } from '@dxos/keys';

import { IconAnnotation } from '../Annotation';
import { LabelAnnotation, TypenameSchema, VersionSchema } from '../Annotation';
import { EntityKind, KindId } from '../common/types';
import { EchoTypeKindSchema } from '../Entity';
import { JsonSchemaType } from '../JsonSchema';

/**
 * Persistent representation of a schema.
 */
// TODO(burdon): Move.
export const PersistentSchema = Schema.Struct({
  name: Schema.optional(Schema.String),
  typename: TypenameSchema,
  version: VersionSchema,
  jsonSchema: JsonSchemaType,
}).pipe(
  EchoTypeKindSchema(DXN.make('org.dxos.type.schema', '0.1.0')),
  LabelAnnotation.set(['name']),
  IconAnnotation.set({
    icon: 'ph--database--regular',
    hue: 'green',
  }),
);

export type PersistentSchema = {
  readonly id: string;
  readonly [KindId]: EntityKind.Type;
  readonly name?: string;
  readonly typename: string;
  readonly version: string;
  readonly jsonSchema: JsonSchemaType;
};
