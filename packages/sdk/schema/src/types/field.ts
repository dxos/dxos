//
// Copyright 2024 DXOS.org
//

import { type SchemaResolver } from '@dxos/echo-db';
import { FormatSchema, S, type FormatType } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';

import { FieldSchema, type ViewType } from './view';

// TODO(burdon): Field and Format are in different namespaces so we ideally shouldn't merge here.
export const FieldProjectionSchema = S.extend(FieldSchema, FormatSchema);

export type FieldProjectionType = S.Schema.Type<typeof FieldProjectionSchema>;

export const getFieldProjection = (
  schemaResolver: SchemaResolver,
  view: ViewType,
  property: string,
): FieldProjectionType => {
  const field = view.fields.find((f) => f.property === property) ?? { property };
  const schema = schemaResolver.getSchema(view.query.__typename);
  invariant(schema);
  const properties = schema.jsonSchema.properties[property] as any as FormatType;
  invariant(properties);
  return { ...field, ...properties };
};
