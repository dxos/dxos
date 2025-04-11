//
// Copyright 2025 DXOS.org
//

import { Schema as S } from 'effect';

import { getTypename } from './typename';
import { schemaVariance } from '../ast';

// TODO(dmaretskyi): Rename to represent commonality between objects and relations (e.g. `entity`).
export type TypedObjectOptions = {
  partial?: true;
  record?: true;
};

/**
 *
 */
// TODO(burdon): Comment required.
// TODO(dmaretskyi): Rename to represent commonality between objects and relations (e.g. `entity`).
type SimplifiedSchemaFields<
  SchemaFields extends S.Struct.Fields,
  Options extends TypedObjectOptions,
> = Options['partial'] extends boolean
  ? S.SimplifyMutable<Partial<S.Struct.Type<SchemaFields>>>
  : S.SimplifyMutable<S.Struct.Type<SchemaFields>>;

/**
 *
 */
// TODO(burdon): Comment required.
// TODO(dmaretskyi): Rename to represent commonality between objects and relations (e.g. `entity`).
export type TypedObjectFields<
  SchemaFields extends S.Struct.Fields,
  Options extends TypedObjectOptions,
> = SimplifiedSchemaFields<SchemaFields, Options> & { id: string } & (Options['record'] extends boolean
    ? S.SimplifyMutable<S.IndexSignature.Type<S.IndexSignature.Records>>
    : {});

export const makeTypedEntityClass = (
  typename: string,
  version: string,
  baseSchema: S.Schema.AnyNoContext,
): S.SchemaClass<any> => {
  return class {
    // Implement TypedObject properties.
    static readonly typename = typename;
    static readonly version = version;

    // Implement S.Schema properties.
    // TODO(burdon): Comment required.
    static readonly [S.TypeId] = schemaVariance;
    static readonly ast = baseSchema.ast;
    static readonly annotations = baseSchema.annotations.bind(baseSchema);
    static readonly pipe = baseSchema.pipe.bind(baseSchema);

    // TODO(burdon): Comment required.
    static [Symbol.hasInstance](obj: unknown) {
      return obj != null && getTypename(obj) === typename;
    }

    // TODO(burdon): Throw APIError.
    private constructor() {
      throw new Error('Use create(Typename, { ...fields }) to instantiate an object.');
    }
  } as any;
};
