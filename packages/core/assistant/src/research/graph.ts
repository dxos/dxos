//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { type EchoDatabase } from '@dxos/echo-db';
import {
  EntityKind,
  getTypeIdentifierAnnotation,
  getTypename,
  getTypeAnnotation,
  getSchemaTypename,
} from '@dxos/echo-schema';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';

// TODO(burdon): Unify with the graph schema.
export const Subgraph = Schema.Struct({
  /** Objects and relations. */
  objects: Schema.Array(Schema.Any),
});
export interface Subgraph extends Schema.Schema.Type<typeof Subgraph> {}

export type RelatedSchema = {
  schema: Schema.Schema.AnyNoContext;
  kind: 'reference' | 'relation';
};

/**
 * Find all schemas that are related to the given schema.
 *
 * @param db
 * @param schema
 * @returns
 */
export const findRelatedSchema = async (
  db: EchoDatabase,
  anchor: Schema.Schema.AnyNoContext,
): Promise<RelatedSchema[]> => {
  // TODO(dmaretskyi): Query stored schemas.
  const allSchemas = [...db.graph.schemaRegistry.schemas];

  // TODO(dmaretskyi): Also do references.
  return allSchemas
    .filter((schema) => {
      if (getTypeAnnotation(schema)?.kind !== EntityKind.Relation) {
        return false;
      }

      log.info('relatedness check', {
        schema,
        anchor,
        anchorId: getTypeIdentifierAnnotation(schema),
        anchorTypename: getTypename(schema),
        sourceDxn: DXN.parse(getTypeAnnotation(schema)!.sourceSchema!),
        targetDxn: DXN.parse(getTypeAnnotation(schema)!.targetSchema!),
      });

      return (
        isSchemaAddressableByDxn(anchor, DXN.parse(getTypeAnnotation(schema)!.sourceSchema!)) ||
        isSchemaAddressableByDxn(anchor, DXN.parse(getTypeAnnotation(schema)!.targetSchema!))
      );
    })
    .map(
      (schema): RelatedSchema => ({
        schema,
        kind: 'relation',
      }),
    );
};

/**
 * Non-strict DXN comparison.
 * Returns true if the DXN could be resolved to the schema.
 */
const isSchemaAddressableByDxn = (schema: Schema.Schema.AnyNoContext, dxn: DXN): boolean => {
  if (getTypeIdentifierAnnotation(schema) === dxn.toString()) {
    return true;
  }

  const t = dxn.asTypeDXN();
  if (t) {
    return t.type === getSchemaTypename(schema);
  }

  return false;
};
