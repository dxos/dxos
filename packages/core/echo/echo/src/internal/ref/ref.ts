//
// Copyright 2024 DXOS.org
//

import { Effect, Option, ParseResult, Schema, SchemaAST } from 'effect';

import { type EncodedReference, Reference } from '@dxos/echo-protocol';
import { compositeRuntime } from '@dxos/echo-signals/runtime';
import { assertArgument, invariant } from '@dxos/invariant';
import { DXN, ObjectId } from '@dxos/keys';

import { ReferenceAnnotationId, getSchemaDXN, getTypeAnnotation, getTypeIdentifierAnnotation } from '../ast';
import { type JsonSchemaType } from '../json-schema';
import type { BaseObject, WithId } from '../types';

/**
 * The `$id` and `$ref` fields for an ECHO reference schema.
 */
export const JSON_SCHEMA_ECHO_REF_ID = '/schemas/echo/ref';

// TODO(burdon): Define return type.
export const getSchemaReference = (property: JsonSchemaType): { typename: string } | undefined => {
  const { $id, reference: { schema: { $ref } = {} } = {} } = property;
  if ($id === JSON_SCHEMA_ECHO_REF_ID && $ref) {
    return { typename: DXN.parse($ref).typename };
  }
};

export const createSchemaReference = (typename: string): JsonSchemaType => {
  return {
    $id: JSON_SCHEMA_ECHO_REF_ID,
    reference: {
      schema: {
        $ref: DXN.fromTypename(typename).toString(),
      },
    },
  };
};

/**
 * Runtime type-info for a reference extracted from effect AST.
 */
export type RefereneAST = {
  /**
   * Typename of linked schema.
   */
  typename: string;

  /**
   * Version of linked schema.
   */
  version: string;
};

export const getReferenceAst = (ast: SchemaAST.AST): RefereneAST | undefined => {
  if (ast._tag !== 'Declaration' || !ast.annotations[ReferenceAnnotationId]) {
    return undefined;
  }
  return {
    typename: (ast.annotations[ReferenceAnnotationId] as any).typename,
    version: (ast.annotations[ReferenceAnnotationId] as any).version,
  };
};

export const RefTypeId: unique symbol = Symbol('@dxos/echo-schema/Ref');

/**
 * Reference Schema.
 */
export interface Ref$<T extends WithId> extends Schema.SchemaClass<Ref<T>, EncodedReference> {}

// Type of the `Ref` function and extra methods attached to it.
export interface RefFn {
  <S extends Schema.Schema.Any>(schema: S): Ref$<Schema.Schema.Type<S>>;

  /**
   * @returns True if the object is a reference.
   */
  isRef: (obj: any) => obj is Ref<any>;

  /**
   * @returns True if the reference points to the given object id.
   */
  hasObjectId: (id: ObjectId) => (ref: Ref<any>) => boolean;

  /**
   * @returns True if the schema is a reference schema.
   */
  isRefSchema: (schema: Schema.Schema<any, any>) => schema is Ref$<any>;

  /**
   * @returns True if the schema AST is a reference schema.
   */
  isRefSchemaAST: (ast: SchemaAST.AST) => boolean;

  /**
   * Constructs a reference that points to the given object.
   */
  // TODO(burdon): Tighten type of T?
  make: <T extends WithId>(object: T) => Ref<T>;

  /**
   * Constructs a reference that points to the object specified by the provided DXN.
   */
  fromDXN: (dxn: DXN) => Ref<any>;
}
/**
 * Schema builder for references.
 */
export const Ref: RefFn = <S extends Schema.Schema.Any>(schema: S): Ref$<Schema.Schema.Type<S>> => {
  assertArgument(Schema.isSchema(schema), 'schema', 'Must call with an instance of effect-schema');

  const annotation = getTypeAnnotation(schema);
  if (annotation == null) {
    throw new Error('Reference target must be an ECHO schema.');
  }

  return createEchoReferenceSchema(
    getTypeIdentifierAnnotation(schema),
    annotation.typename,
    annotation.version,
    getSchemaExpectedName(schema.ast),
  );
};

/**
 * Represents materialized reference to a target.
 * This is the data type for the fields marked as ref.
 */
export interface Ref<T> {
  /**
   * Target object DXN.
   */
  get dxn(): DXN;

  /**
   * @returns The reference target.
   * May return `undefined` if the object is not loaded in the working set.
   * Accessing this property, even if it returns `undefined` will trigger the object to be loaded to the working set.
   *
   * @reactive Supports signal subscriptions.
   */
  get target(): T | undefined;

  /**
   * @returns Promise that will resolves with the target object.
   * Will load the object from disk if it is not present in the working set.
   * @throws If the object is not available locally.
   */
  load(): Promise<T>;

  /**
   * @returns Promise that will resolves with the target object or undefined if the object is not loaded locally.
   */
  tryLoad(): Promise<T | undefined>;

  /**
   * Do not inline the target object in the reference.
   * Makes .target unavailable unless the reference is connected to a database context.
   *
   * When serialized with toJSON, the difference is between:
   * `{ "/": "dxn:..." }`
   * and
   * `{ "/": "dxn:...", "target": { ... } }`
   *
   * Clones the reference object.
   */
  noInline(): Ref<T>;

  /**
   * Serializes the reference to a JSON object.
   * The serialization format is compatible with the IPLD-style encoded references.
   * When a reference has a saved target (i.e. the target or object holding the reference is not in the database),
   * the target is included in the serialized object.
   *
   * Examples:
   * `{ "/": "dxn:..." }`
   * `{ "/": "dxn:...", "target": { ... } }`
   */
  encode(): EncodedReference;

  [RefTypeId]: {
    _T: T;
  };
}

export declare namespace Ref {
  /**
   * Target of the reference.
   */
  export type Target<R> = R extends Ref<infer U> ? U : never;
}

Ref.isRef = (obj: any): obj is Ref<any> => {
  return obj && typeof obj === 'object' && RefTypeId in obj;
};

Ref.hasObjectId = (id: ObjectId) => (ref: Ref<any>) => ref.dxn.isLocalObjectId() && ref.dxn.parts[1] === id;

Ref.isRefSchema = (schema: Schema.Schema<any, any>): schema is Ref$<any> => {
  return Ref.isRefSchemaAST(schema.ast);
};

Ref.isRefSchemaAST = (ast: SchemaAST.AST): boolean => {
  return SchemaAST.getAnnotation(ast, ReferenceAnnotationId).pipe(Option.isSome);
};

Ref.make = <T extends BaseObject>(obj: T): Ref<T> => {
  if (typeof obj !== 'object' || obj === null) {
    throw new TypeError('Expected: ECHO object.');
  }

  // TODO(dmaretskyi): Extract to `getObjectDXN` function.
  const id = obj.id;
  invariant(ObjectId.isValid(id), 'Invalid object ID');
  const dxn = Reference.localObjectReference(id).toDXN();
  return new RefImpl(dxn, obj);
};

Ref.fromDXN = (dxn: DXN): Ref<any> => {
  assertArgument(dxn instanceof DXN, 'dxn', 'Expected DXN');
  return new RefImpl(dxn);
};

/**
 * `reference` field on the schema object.
 */
export type JsonSchemaReferenceInfo = {
  schema: { $ref: string };
  schemaVersion?: string;
};

/**
 * @internal
 */
// TODO(burdon): Move to json schema and make private?
export const createEchoReferenceSchema = (
  echoId: string | undefined,
  typename: string | undefined,
  version: string | undefined,
  schemaName?: string,
): Schema.SchemaClass<Ref<any>, EncodedReference> => {
  if (!echoId && !typename) {
    throw new TypeError('Either echoId or typename must be provided.');
  }

  const referenceInfo: JsonSchemaReferenceInfo = {
    schema: {
      // TODO(dmaretskyi): Include version?
      $ref: echoId ?? DXN.fromTypename(typename!).toString(),
    },
    schemaVersion: version,
  };

  // TODO(dmaretskyi): Add name and description.
  const refSchema = Schema.declare<Ref<any>, EncodedReference, []>(
    [],
    {
      encode: () => {
        return (value) => {
          return Effect.succeed({
            '/': (value as Ref<any>).dxn.toString(),
          });
        };
      },
      decode: () => {
        return (value) => {
          // TODO(dmaretskyi): This branch seems to be taken by Schema.is
          if (Ref.isRef(value)) {
            return Effect.succeed(value);
          }

          if (typeof value !== 'object' || value == null || typeof (value as any)['/'] !== 'string') {
            return Effect.fail(new ParseResult.Unexpected(value, 'reference'));
          }

          return Effect.succeed(Ref.fromDXN(DXN.parse((value as any)['/'])));
        };
      },
    },
    {
      jsonSchema: {
        // TODO(dmaretskyi): We should remove `$id` and keep `$ref` with a fully qualified name.
        $id: JSON_SCHEMA_ECHO_REF_ID,
        $ref: JSON_SCHEMA_ECHO_REF_ID,
        reference: referenceInfo,
      },
      [ReferenceAnnotationId]: {
        typename: typename ?? '',
        version,
      },
    },
  );

  return refSchema;
};

const getSchemaExpectedName = (ast: SchemaAST.Annotated): string | undefined => {
  return SchemaAST.getIdentifierAnnotation(ast).pipe(
    Option.orElse(() => SchemaAST.getTitleAnnotation(ast)),
    Option.orElse(() => SchemaAST.getDescriptionAnnotation(ast)),
    Option.getOrElse(() => undefined),
  );
};

export interface RefResolver {
  /**
   * Resolve ref synchronously from the objects in the working set.
   *
   * @param dxn
   * @param load If true the resolver should attempt to load the object from disk.
   * @param onLoad Callback to call when the object is loaded.
   */
  resolveSync(dxn: DXN, load: boolean, onLoad?: () => void): BaseObject | undefined;

  /**
   * Resolver ref asynchronously.
   */
  resolve(dxn: DXN): Promise<BaseObject | undefined>;

  // TODO(dmaretskyi): Combine with `resolve`.
  resolveSchema(dxn: DXN): Promise<Schema.Schema.AnyNoContext | undefined>;
}

export class RefImpl<T> implements Ref<T> {
  #dxn: DXN;
  #resolver?: RefResolver = undefined;
  #signal = compositeRuntime.createSignal();

  /**
   * Target is set when the reference is created from a specific object.
   * In this case, the target might not be in the database.
   */
  #target: T | undefined = undefined;

  /**
   * Callback to issue a reactive notification when object is resolved.
   */
  #resolverCallback = () => {
    this.#signal.notifyWrite();
  };

  constructor(dxn: DXN, target?: T) {
    this.#dxn = dxn;
    this.#target = target;
  }

  /**
   * @inheritdoc
   */
  get dxn(): DXN {
    return this.#dxn;
  }

  /**
   * @inheritdoc
   */
  get target(): T | undefined {
    this.#signal.notifyRead();
    if (this.#target) {
      return this.#target;
    }

    invariant(this.#resolver, 'Resolver is not set');
    return this.#resolver.resolveSync(this.#dxn, true, this.#resolverCallback) as T | undefined;
  }

  /**
   * @inheritdoc
   */
  async load(): Promise<T> {
    if (this.#target) {
      return this.#target;
    }
    invariant(this.#resolver, 'Resolver is not set');
    const obj = await this.#resolver.resolve(this.#dxn);
    if (obj == null) {
      throw new Error('Object not found');
    }
    return obj as T;
  }

  /**
   * @inheritdoc
   */
  async tryLoad(): Promise<T | undefined> {
    invariant(this.#resolver, 'Resolver is not set');
    return (await this.#resolver.resolve(this.#dxn)) as T | undefined;
  }

  /**
   * Do not inline the target object in the reference.
   * Makes .target unavailable unless the reference is connected to a database context.
   * Clones the reference object.
   */
  noInline(): RefImpl<T> {
    const ref = new RefImpl<T>(this.#dxn, undefined);
    ref.#resolver = this.#resolver;
    return ref;
  }

  encode(): EncodedReference {
    return {
      '/': this.#dxn.toString(),
      ...(this.#target ? { target: this.#target } : {}),
    };
  }

  /**
   * Serializes the reference to a JSON object.
   * The serialization format is compatible with the IPLD-style encoded references.
   * When a reference has a saved target (i.e. the target or object holding the reference is not in the database),
   * the target is included in the serialized object.
   */
  toJSON(): EncodedReference {
    return this.encode();
  }

  toString(): string {
    if (this.#target) {
      return `Ref(${this.#target.toString()})`;
    }

    return `Ref(${this.#dxn.toString()})`;
  }

  [RefTypeId] = refVariance;

  /**
   * Internal method to set the resolver.
   * @internal
   */
  _setResolver(resolver: RefResolver): void {
    this.#resolver = resolver;
  }

  /**
   * Internal method to get the saved target.
   * Not the same as `target` which is resolved from the resolver.
   * @internal
   */
  _getSavedTarget(): T | undefined {
    return this.#target;
  }
}

/**
 * Internal API for setting the reference resolver.
 */
export const setRefResolver = (ref: Ref<any>, resolver: RefResolver) => {
  invariant(ref instanceof RefImpl, 'Ref is not an instance of RefImpl');
  ref._setResolver(resolver);
};

/**
 * Internal API for getting the saved target on a reference.
 */
export const getRefSavedTarget = (ref: Ref<any>): BaseObject | undefined => {
  invariant(ref instanceof RefImpl, 'Ref is not an instance of RefImpl');
  return ref._getSavedTarget();
};

// Used to validate reference target type.
const refVariance: Ref<any>[typeof RefTypeId] = {
  _T: null as any,
};

export const refFromEncodedReference = (encodedReference: EncodedReference, resolver?: RefResolver): Ref<any> => {
  const dxn = DXN.parse(encodedReference['/']);
  const ref = new RefImpl(dxn);

  // TODO(dmaretskyi): Handle inline target in the encoded reference.

  if (resolver) {
    setRefResolver(ref, resolver);
  }
  return ref;
};

export class StaticRefResolver implements RefResolver {
  public objects = new Map<ObjectId, BaseObject>();
  public schemas = new Map<DXN.String, Schema.Schema.AnyNoContext>();

  addObject(obj: BaseObject): this {
    this.objects.set(obj.id, obj);
    return this;
  }

  addSchema(schema: Schema.Schema.AnyNoContext): this {
    const dxn = getSchemaDXN(schema);
    invariant(dxn, 'Schema has no DXN');
    this.schemas.set(dxn.toString(), schema);
    return this;
  }

  resolveSync(dxn: DXN, _load: boolean, _onLoad?: () => void): BaseObject | undefined {
    const id = dxn?.asEchoDXN()?.echoId;
    if (id == null) {
      return undefined;
    }

    return this.objects.get(id);
  }

  async resolve(dxn: DXN): Promise<BaseObject | undefined> {
    const id = dxn?.asEchoDXN()?.echoId;
    if (id == null) {
      return undefined;
    }

    return this.objects.get(id);
  }

  async resolveSchema(dxn: DXN): Promise<Schema.Schema.AnyNoContext | undefined> {
    return this.schemas.get(dxn.toString());
  }
}
