import { DXN } from '@dxos/keys';
import { Schema as S } from '@effect/schema';
import { getObjectAnnotation } from '../ast';

type DefineObjectMigrationOptions<From extends S.Schema.AnyNoContext, To extends S.Schema.AnyNoContext> = {
  from: From;
  to: To;
  /**
   * Pure function that converts the old object data to the new object data.
   */
  transform: (from: S.Schema.Type<From>, context: ObjectMigrationContext) => Promise<S.Schema.Type<To>>;

  // TODO(dmaretskyi): Add an on-migration callback that will allow to do further database updates. E.g. creating new relations.
};

// TODO(dmaretskyi): For future extensibility.
type ObjectMigrationContext = {};

export type ObjectMigration = {
  fromType: DXN;
  toType: DXN;
  fromSchema: S.Schema.AnyNoContext;
  toSchema: S.Schema.AnyNoContext;
  transform: (from: unknown, context: ObjectMigrationContext) => Promise<unknown>;
};

export const defineObjectMigration = <From extends S.Schema.AnyNoContext, To extends S.Schema.AnyNoContext>(
  options: DefineObjectMigrationOptions<From, To>,
): ObjectMigration => {
  const fromType = getSchemaDXN(options.from);
  if (!fromType) {
    throw new Error('Invalid from schema');
  }
  const toType = getSchemaDXN(options.to);
  if (!toType) {
    throw new Error('Invalid to schema');
  }

  return {
    fromType,
    toType,
    fromSchema: options.from,
    toSchema: options.to,
    transform: options.transform as any,
  };
};

// TODO(dmaretskyi): Extract when schema PR lands
const getSchemaDXN = (schema: S.Schema.AnyNoContext): DXN | undefined => {
  // TODO(dmaretskyi): Add support for dynamic schema.
  const objectAnnotation = getObjectAnnotation(schema);
  if (!objectAnnotation) {
    return undefined;
  }

  return DXN.fromTypenameAndVersion(objectAnnotation.typename, objectAnnotation.version);
};
