import { EntityKind, getTypeIdentifierAnnotation, getTypename } from '@dxos/echo-schema';

import type { EchoDatabase } from '@dxos/echo-db';
import { getTypeAnnotation } from '@dxos/echo-schema';
import type { Schema } from 'effect';
import { DXN } from '@dxos/keys';

export type RelatedSchema = {
  schema: Schema.Schema.AnyNoContext;
  kind: 'relation' | 'reference';
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
