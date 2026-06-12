//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Equal from 'effect/Equal';
import * as Hash from 'effect/Hash';
import * as Option from 'effect/Option';
import * as ParseResult from 'effect/ParseResult';
import * as Pipeable from 'effect/Pipeable';
import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import type * as Types from 'effect/Types';

import { Event } from '@dxos/async';
import { type CustomInspectFunction, inspectCustom } from '@dxos/debug';
import { EncodedReference } from '@dxos/echo-protocol';
import { assertArgument, invariant } from '@dxos/invariant';
import { DXN, EID, EntityId, type URI } from '@dxos/keys';

import * as Database from '../../Database';
import type * as Type from '../../Type';
import {
  ReferenceAnnotationId,
  getSchemaURI,
  getTypeAnnotation,
  getTypeIdentifierAnnotation,
} from '../Annotation/annotations';
import { type AnyEntity, type AnyProperties, type UnknownTypeSchema, getStaticTypeSchema } from '../common/types';
import { type JsonSchemaType } from '../JsonSchema';

/**
 * The `$id` and `$ref` fields for an ECHO reference schema.
 */
export const JSON_SCHEMA_ECHO_REF_ID = '/schemas/echo/ref';

export const getSchemaReference = (property: JsonSchemaType): { typename: string } | undefined => {
  const { $id, reference: { schema: { $ref } = {} } = {} } = property;
  if ($id === JSON_SCHEMA_ECHO_REF_ID && $ref) {
    const parsed = DXN.tryMake($ref);
    const typename = parsed ? DXN.getName(parsed) : undefined;
    return typename ? { typename } : undefined;
  }
};

export const createSchemaReference = (typename: string): Types.DeepMutable<JsonSchemaType> => {
  return {
    $id: JSON_SCHEMA_ECHO_REF_ID,
    reference: {
      schema: {
        $ref: DXN.make(typename),
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

// Symbol.for ensures cross-bundle identity: two copies of this module share the same symbol.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const RefTypeId: unique symbol = Symbol.for('@dxos/echo/internal/Ref') as any;

/**
 * Reference Schema.
 */
export interface RefSchema<T extends AnyEntity> extends Schema.SchemaClass<Ref<T>, EncodedReference> {}

/**
 * Type of the `Ref` function and extra methods attached to it.
 */
export interface RefFn {
  // A reference target is a `Type.AnyEntity` entity (the canonical Option B
  // input) or one of the well-known "any object" / "any relation" branded
  // schemas (`Obj.Unknown` / `Relation.Unknown`). Arbitrary raw schemas are
  // rejected.
  //
  // Referencing a type-kind entity (a meta-schema, e.g. `Type.Type`) yields a
  // reference to a stored schema record; its loaded target is any registered
  // entity (`Type.AnyEntity`), since a stored object/relation schema is itself a
  // `Type.Type` record. Referencing an object/relation type yields a reference
  // to an instance of that type.
  <S extends Type.AnyEntity | UnknownTypeSchema<any, any> = Type.AnyEntity>(
    schema: S,
  ): RefSchema<
    S extends Type.AnyType
      ? Type.AnyEntity
      : S extends Type.AnyObj | Type.AnyRelation
        ? Type.InstanceType<S>
        : S extends UnknownTypeSchema<infer A, any>
          ? A
          : never
  >;

  /**
   * @returns True if the object is a reference.
   */
  isRef: (obj: unknown) => obj is Ref<any>;

  /**
   * @returns True if the reference points to the given object id.
   */
  hasEntityId: (id: EntityId) => (ref: Ref<any>) => boolean;

  /**
   * @returns True if the schema is a reference schema.
   */
  isRefSchema: (schema: Schema.Schema<any, any>) => schema is RefSchema<any>;

  /**
   * @returns True if the schema AST is a reference schema.
   */
  isRefSchemaAST: (ast: SchemaAST.AST) => boolean;

  /**
   * Constructs a reference that points to the given object.
   */
  // TODO(burdon): Narrow to Obj.Unknown?
  make: <T extends AnyEntity>(object: T) => Ref<T>;

  /**
   * Constructs a reference that points to the object specified by the provided URI
   * (either an `echo:` EID for an object reference or a `dxn:` DXN for a type reference).
   */
  fromURI: (uri: URI.URI) => Ref<any>;
}

/**
 * Schema builder for references.
 */
export const Ref: RefFn = (input: any): RefSchema<any> => {
  // `Type.Type` entities carry their source schema on the hidden slot; the
  // branded `Obj.Unknown` / `Relation.Unknown` schemas are used directly.
  const schema = getStaticTypeSchema(input) ?? input;
  assertArgument(Schema.isSchema(schema), 'schema', 'Must call with an instance of effect-schema');
  const annotation = getTypeAnnotation(schema);
  if (annotation == null) {
    throw new Error('Reference target must be an ECHO schema.');
  }

  return createEchoReferenceSchema(getTypeIdentifierAnnotation(schema), annotation.typename, annotation.version);
};

/**
 * Represents materialized reference to a target.
 * This is the data type for the fields marked as ref.
 */
export interface Ref<T> extends Pipeable.Pipeable {
  /**
   * Target URI (either an `echo:` EID for an object reference or a `dxn:` DXN for a type reference).
   */
  get uri(): URI.URI;

  /**
   * Returns true if the reference has a target available (inlined or resolver set).
   */
  get isAvailable(): boolean;

  /**
   * @returns The reference target.
   * May return `undefined` if the object is not loaded in the working set.
   * Accessing this property, even if it returns `undefined` will trigger the object to be loaded to the working set.
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
   * Subscribe to the ref's resolution event.
   * The callback fires when the target object becomes available in the working set
   * (e.g. when its document is loaded after sibling-client mutation).
   * Note: the resolver only schedules a notification when the target is requested
   * via {@link target} while it is not yet loaded.
   * @returns Function that unsubscribes the callback.
   */
  onResolved(callback: () => void): () => void;

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

Ref.hasEntityId = (id: EntityId) => (ref: Ref<any>) => {
  const uri = EID.tryParse(ref.uri);
  return uri !== undefined && EID.isLocal(uri) && EID.getEntityId(uri) === id;
};

Ref.isRefSchema = (schema: Schema.Schema<any, any>): schema is RefSchema<any> => {
  return Ref.isRefSchemaAST(schema.ast);
};

Ref.isRefSchemaAST = (ast: SchemaAST.AST): boolean => {
  return SchemaAST.getAnnotation(ast, ReferenceAnnotationId).pipe(Option.isSome);
};

Ref.make = <T extends AnyProperties>(obj: T): Ref<T> => {
  if (typeof obj !== 'object' || obj === null) {
    throw new TypeError('Expected: ECHO object.');
  }

  // TODO(dmaretskyi): Extract to `getObjectEchoUri` function.
  const id = obj.id;
  invariant(EntityId.isValid(id), 'Invalid object ID');
  const uri = EID.make({ entityId: id });
  return new RefImpl(uri, obj);
};

Ref.fromURI = (uri: URI.URI): Ref<any> => {
  assertArgument(typeof uri === 'string', 'uri', 'Expected URI string');
  return new RefImpl(uri);
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
  echoUri: string | undefined,
  typename: string | undefined,
  version: string | undefined,
): Schema.SchemaClass<Ref<any>, EncodedReference> => {
  if (!echoUri && !typename) {
    throw new TypeError('Either echoUri or typename must be provided.');
  }

  const referenceInfo: JsonSchemaReferenceInfo = {
    schema: {
      // TODO(dmaretskyi): Include version?
      $ref: echoUri ?? DXN.make(typename!),
    },
    schemaVersion: version,
  };

  // TODO(dmaretskyi): Add name and description.
  const refSchema = Schema.declare<Ref<any>, EncodedReference, []>(
    [],
    {
      encode: () => {
        return (value) =>
          Effect.gen(function* () {
            if (Ref.isRef(value)) {
              return EncodedReference.fromURI((value as Ref<any>).uri);
            } else if (EncodedReference.isEncodedReference(value)) {
              return value;
            }
            throw new Error('Invalid reference');
          });
      },
      decode: () => {
        return (value) =>
          Effect.gen(function* () {
            const dbService = yield* Effect.serviceOption(Database.Service);

            // TODO(dmaretskyi): This branch seems to be taken by Schema.is
            if (Ref.isRef(value)) {
              if (Option.isSome(dbService)) {
                return dbService.value.db.makeRef(value.uri);
              } else {
                return value;
              }
            }

            if (!EncodedReference.isEncodedReference(value)) {
              return yield* Effect.fail(new ParseResult.Unexpected(value, 'reference'));
            }
            if (Option.isSome(dbService)) {
              return dbService.value.db.makeRef(EncodedReference.toURI(value));
            } else {
              return Ref.fromURI(EncodedReference.toURI(value));
            }
          });
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
   * @param uri
   * @param load If true the resolver should attempt to load the object from disk.
   * @param onLoad Callback to call when the object is loaded.
   */
  resolveSync(uri: URI.URI, load: boolean, onLoad?: () => void): AnyProperties | undefined;

  /**
   * Resolver ref asynchronously.
   */
  resolve(uri: URI.URI): Promise<AnyProperties | undefined>;

  // TODO(dmaretskyi): Combine with `resolve`.
  resolveSchema(uri: URI.URI): Promise<Schema.Schema.AnyNoContext | undefined>;

  /**
   * Resolve the source `Type.AnyEntity` entity for a type URI. Used by
   * deserialization paths (`Obj.fromJSON`) to set the back-reference accessed
   * via `Obj.getType` / `Entity.getType`. Optional — resolvers that only
   * carry raw schemas may leave this unimplemented; the deserializer falls
   * back to leaving the type entity unset.
   */
  resolveType?(uri: URI.URI): Promise<unknown | undefined>;
}

export class RefImpl<T> implements Ref<T> {
  #uri: URI.URI;
  #resolver?: RefResolver = undefined;
  #resolved = new Event<void>();

  /**
   * Target is set when the reference is created from a specific object.
   * In this case, the target might not be in the database.
   */
  #target: T | undefined = undefined;

  /**
   * Callback to issue a reactive notification when object is resolved.
   */
  #resolverCallback = () => {
    this.#resolved.emit();
  };

  constructor(uri: URI.URI, target?: T) {
    this.#uri = uri;
    this.#target = target;
  }

  /**
   * @inheritdoc
   */
  get uri(): URI.URI {
    return this.#uri;
  }

  /**
   * @inheritdoc
   */
  get isAvailable(): boolean {
    return this.#target !== undefined || this.#resolver !== undefined;
  }

  /**
   * @inheritdoc
   */
  get target(): T | undefined {
    if (this.#target) {
      return this.#target;
    }

    invariant(this.#resolver, 'Resolver is not set');
    return this.#resolver.resolveSync(this.#uri, true, this.#resolverCallback) as T | undefined;
  }

  /**
   * @inheritdoc
   */
  async load(): Promise<T> {
    if (this.#target) {
      return this.#target;
    }
    invariant(this.#resolver, 'Resolver is not set');
    const obj = await this.#resolver.resolve(this.#uri);
    if (obj == null) {
      throw new Error('Object not found');
    }
    return obj as T;
  }

  /**
   * @inheritdoc
   */
  async tryLoad(): Promise<T | undefined> {
    if (this.#target) {
      return this.#target;
    }
    invariant(this.#resolver, 'Resolver is not set');
    return (await this.#resolver.resolve(this.#uri)) as T | undefined;
  }

  /**
   * @inheritdoc
   */
  onResolved(callback: () => void): () => void {
    return this.#resolved.on(callback);
  }

  /**
   * Do not inline the target object in the reference.
   * Makes .target unavailable unless the reference is connected to a database context.
   * Clones the reference object.
   */
  noInline(): RefImpl<T> {
    const ref = new RefImpl<T>(this.#uri, undefined);
    ref.#resolver = this.#resolver;
    return ref;
  }

  encode(): EncodedReference {
    return {
      '/': this.#uri,
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

    return `Ref(${this.#uri.toString()})`;
  }

  [inspectCustom]: CustomInspectFunction = (depth, options, inspect) => {
    return this.toString();
  };

  [RefTypeId] = refVariance;

  /**
   * Effect Hash trait. Required for MutableHashMap-based caches (e.g., Atom.family)
   * to deduplicate Ref instances that point to the same object.
   * ECHO proxies return new RefImpl instances on every property access,
   * so without this, each access would create a separate cache entry.
   */
  [Hash.symbol](): number {
    return Hash.hash(this.#uri.toString());
  }

  /** Effect Equal trait. See {@link Hash.symbol} for rationale. */
  [Equal.symbol](that: Equal.Equal): boolean {
    return that instanceof RefImpl && this.#uri === that.uri;
  }

  /**
   * Internal method to set the resolver.
   *
   * @internal
   */
  _setResolver(resolver: RefResolver): void {
    this.#resolver = resolver;
  }

  /**
   * @internal
   */
  _getSavedTarget(): T | undefined {
    return this.#target;
  }

  pipe() {
    // eslint-disable-next-line prefer-rest-params
    return Pipeable.pipeArguments(this, arguments);
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
export const getRefSavedTarget = (ref: Ref<any>): AnyProperties | undefined => {
  invariant(ref instanceof RefImpl, 'Ref is not an instance of RefImpl');
  return ref._getSavedTarget();
};

// Used to validate reference target type.
const refVariance: Ref<any>[typeof RefTypeId] = {
  _T: null as any,
};

export const refFromEncodedReference = (encodedReference: EncodedReference, resolver?: RefResolver): Ref<any> => {
  const uri = EncodedReference.toURI(encodedReference);
  const ref = new RefImpl(uri);

  // TODO(dmaretskyi): Handle inline target in the encoded reference.

  if (resolver) {
    setRefResolver(ref, resolver);
  }
  return ref;
};

export class StaticRefResolver implements RefResolver {
  public objects = new Map<EntityId, AnyProperties>();
  public schemas = new Map<URI.URI, Schema.Schema.AnyNoContext>();

  addObject(obj: AnyProperties): this {
    this.objects.set(obj.id, obj);
    return this;
  }

  addSchema(input: Type.AnyEntity): this {
    const schema = getStaticTypeSchema(input);
    invariant(schema, 'Type entity is missing its source schema');
    const uri = getSchemaURI(schema);
    invariant(uri, 'Schema has no URI');
    this.schemas.set(uri, schema);
    return this;
  }

  resolveSync(uri: URI.URI, _load: boolean, _onLoad?: () => void): AnyProperties | undefined {
    const echoUri = EID.tryParse(uri);
    const id = echoUri ? EID.getEntityId(echoUri) : undefined;
    if (id == null) {
      return undefined;
    }

    return this.objects.get(id);
  }

  async resolve(uri: URI.URI): Promise<AnyProperties | undefined> {
    const echoUri = EID.tryParse(uri);
    const id = echoUri ? EID.getEntityId(echoUri) : undefined;
    if (id == null) {
      return undefined;
    }

    return this.objects.get(id);
  }

  async resolveSchema(uri: URI.URI): Promise<Schema.Schema.AnyNoContext | undefined> {
    return this.schemas.get(uri);
  }
}
