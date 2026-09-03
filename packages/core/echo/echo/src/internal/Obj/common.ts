//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { getTypename } from '../Annotation/index.ts';
import { type AnyProperties } from '../common/types/index.ts';

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
  ? Struct.Simplify<Struct.Mutable<Partial<Schema.Struct.Type<SchemaFields>>>>
  : Struct.Simplify<Struct.Mutable<Schema.Struct.Type<SchemaFields>>>;

/**
 *
 */
// TODO(burdon): Comment required.
// TODO(dmaretskyi): Rename to represent commonality between objects and relations (e.g. `entity`).
export type TypedObjectFields<
  SchemaFields extends Schema.Struct.Fields,
  Options extends TypedObjectOptions,
> = SimplifiedSchemaFields<SchemaFields, Options> & { id: string } & (Options['record'] extends boolean
    ? Record<string, any>
    : {});

export const makeTypedEntityClass = (typename: string, version: string, baseSchema: Schema.Top): Schema.Codec<any> => {
  return class {
    // Implement TypedObject properties.
    static readonly typename = typename;
    static readonly version = version;

    // Implement Schema.Schema properties.
    // Effect 4 marks a schema with a string key carrying its own name, replacing v3's variance
    // object; `annotations` became `annotate`.
    static readonly [SCHEMA_TYPE_ID] = SCHEMA_TYPE_ID;
    static readonly ast = baseSchema.ast;
    static readonly annotate = baseSchema.annotate.bind(baseSchema);
    static readonly pipe = baseSchema.pipe.bind(baseSchema);

    // TODO(burdon): Comment required.
    static [Symbol.hasInstance](obj: AnyProperties) {
      return obj != null && getTypename(obj) === typename;
    }

    // TODO(burdon): Throw APIError.
    private constructor() {
      throw new Error('Use live(Typename, { ...fields }) to instantiate an object.');
    }
  } as any;
};

/** Effect 4's schema marker; the module declares it privately, so the literal is repeated here. */
const SCHEMA_TYPE_ID = '~effect/Schema/Schema';
