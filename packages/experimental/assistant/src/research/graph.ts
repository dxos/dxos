//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { type EchoDatabase } from '@dxos/echo-db';
import { EntityKind, getTypeIdentifierAnnotation, getTypename, getTypeAnnotation } from '@dxos/echo-schema';
import { DXN } from '@dxos/keys';

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
  schema: Schema.Schema.AnyNoContext,
): Promise<RelatedSchema[]> => {
  // TODO(dmaretskyi): Query stored schemas.
  const allSchemas = [...db.graph.schemaRegistry.schemas];

  // TODO(dmaretskyi): Also do references.
  return allSchemas
    .filter(
      (s) =>
        getTypeAnnotation(s)?.kind === EntityKind.Relation &&
        (schemaAddressableByDxn(s, DXN.parse(getTypeAnnotation(s)!.sourceSchema!)) ||
          schemaAddressableByDxn(s, DXN.parse(getTypeAnnotation(s)!.targetSchema!))),
    )
    .map(
      (s): RelatedSchema => ({
        schema: s,
        kind: 'relation',
      }),
    );
};

/**
 * Non-strict DXN comparison.
 *
 * Returns true if the DXN could be resolved to the schema.
 */
const schemaAddressableByDxn = (schema: Schema.Schema.AnyNoContext, dxn: DXN) => {
  if (getTypeIdentifierAnnotation(schema) === dxn.toString()) {
    return true;
  }

  const t = dxn.asTypeDXN();
  if (t) {
    return t.type === getTypename(schema);
  }
};
