//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type BaseObject } from '../types';

import { getTypename } from './typename';

// TODO(dmaretskyi): Rename to represent commonality between objects and relations (e.g. `entity`).
export type TypedObjectOptions = {
  // TODO(burdon): Document.
  partial?: true;
  // TODO(burdon): Document.
  record?: true;
};

/**
 *
 */
// TODO(burdon): Comment required.
// TODO(dmaretskyi): Rename to represent commonality between objects and relations (e.g. `entity`).
type SimplifiedSchemaFields<
  SchemaFields extends Schema.Struct.Fields,
  Options extends TypedObjectOptions,
> = Options['partial'] extends boolean
  ? Schema.SimplifyMutable<Partial<Schema.Struct.Type<SchemaFields>>>
  : Schema.SimplifyMutable<Schema.Struct.Type<SchemaFields>>;

/**
 *
 */
// TODO(burdon): Comment required.
// TODO(dmaretskyi): Rename to represent commonality between objects and relations (e.g. `entity`).
export type TypedObjectFields<
  SchemaFields extends Schema.Struct.Fields,
  Options extends TypedObjectOptions,
> = SimplifiedSchemaFields<SchemaFields, Options> & { id: string } & (Options['record'] extends boolean
    ? Schema.SimplifyMutable<Schema.IndexSignature.Type<Schema.IndexSignature.Records>>
    : {});

export const makeTypedEntityClass = (
  typename: string,
  version: string,
  baseSchema: Schema.Schema.AnyNoContext,
): Schema.SchemaClass<any> =>
  class {
    // Implement TypedObject properties.
    static readonly typename = typename;
    static readonly version = version;

    // Implement Schema.Schema properties.
    // TODO(burdon): Comment required.
    static readonly [Schema.TypeId] = schemaVariance;
    static readonly ast = baseSchema.ast;
    static readonly annotations = baseSchema.annotations.bind(baseSchema);
    static readonly pipe = baseSchema.pipe.bind(baseSchema);

    // TODO(burdon): Comment required.
    static [Symbol.hasInstance](obj: BaseObject) {
      return obj != null && getTypename(obj) === typename;
    }

    // TODO(burdon): Throw APIError.
    private constructor() {
      throw new Error('Use live(Typename, { ...fields }) to instantiate an object.');
    }
  } as any;

const schemaVariance = {
  _A: (_: any) => _,
  _I: (_: any) => _,
  _R: (_: never) => _,
};
