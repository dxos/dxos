//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

import { type CleanupFn, Event } from '@dxos/async';
import { type Context, Resource } from '@dxos/context';
import {
  EchoSchema,
  type ObjectId,
  StoredSchema,
  TypeAnnotationId,
  TypeIdentifierAnnotationId,
  create,
  getTypeAnnotation,
  getTypeIdentifierAnnotation,
  makeTypeJsonSchemaAnnotation,
  toJsonSchema,
} from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';

import { getObjectCore } from '../echo-handler';
import { Filter } from '../query';

import { type EchoDatabase } from './database';
import type {
  RegisterSchemaInput,
  SchemaRegistry,
  SchemaRegistryPreparedQuery,
  SchemaRegistryQuery,
  SchemaSubscriptionCallback,
} from './schema-registry-api';
import { SchemaRegistryPreparedQueryImpl } from './schema-registry-prepared-query';
import { Type } from '../../../echo/src';

export type EchoSchemaRegistryOptions = {
  /**
   * Run a reactive query for dynamic schemas.
   * @default true
   */
  reactiveQuery?: boolean;

  /**
   * Preload all schema during open.
   * @default true
   */
  preloadSchemaOnOpen?: boolean;
};

/**
 * Per-space set of mutable schemas.
 */
// TODO(burdon): Reconcile with RuntimeSchemaRegistry. Rename (no product name in types).
export class EchoSchemaRegistry extends Resource implements SchemaRegistry {
  private readonly _reactiveQuery: boolean;
  private readonly _preloadSchemaOnOpen: boolean;

  private readonly _schemaById: Map<string, EchoSchema> = new Map();
  private readonly _schemaByType: Map<string, EchoSchema> = new Map();
  private readonly _unsubscribeById: Map<string, CleanupFn> = new Map();
  private readonly _schemaSubscriptionCallbacks: SchemaSubscriptionCallback[] = [];

  constructor(
    private readonly _db: EchoDatabase,
    { reactiveQuery = true, preloadSchemaOnOpen = true }: EchoSchemaRegistryOptions = {},
  ) {
    super();
    this._reactiveQuery = reactiveQuery;
    this._preloadSchemaOnOpen = preloadSchemaOnOpen;
  }

  protected override async _open(_ctx: Context): Promise<void> {
    // Preloading schema is required for ECHO to operate.
    // TODO(dmaretskyi): Does this change with strong object deps.
    if (this._preloadSchemaOnOpen) {
      const { objects } = await this._db.query(Filter.type(StoredSchema)).run();

      objects.forEach((object) => this._registerSchema(object));
    }

    if (this._reactiveQuery) {
      const unsubscribe = this._db.query(Filter.type(StoredSchema)).subscribe(({ objects }) => {
        const currentObjectIds = new Set(objects.map((o) => o.id));
        const newObjects = objects.filter((object) => !this._schemaById.has(object.id));
        const removedObjects = [...this._schemaById.keys()].filter((oid) => !currentObjectIds.has(oid));
        newObjects.forEach((obj) => this._register(obj));
        removedObjects.forEach((idoid) => this._unregister(idoid));
        if (newObjects.length > 0 || removedObjects.length > 0) {
          this._notifySchemaListChanged();
        }
      });
      this._ctx.onDispose(unsubscribe);
    }
  }

  protected override async _close(ctx: Context): Promise<void> {
    // Nothing to do.
  }

  query(query: SchemaRegistryQuery = {}): SchemaRegistryPreparedQuery<EchoSchema> {
    const self = this;

    const filterOrderResults = (schemas: EchoSchema[]) => {
      log('Filtering schemas', { schemas, query });
      return (
        schemas
          .filter((schema) => validateStoredSchemaIntegrity(schema.storedSchema))
          .filter((object) => {
            const idFilter = coerceArray(query.id);
            if (idFilter.length > 0) {
              if (object.jsonSchema.$id && !idFilter.includes(object.jsonSchema.$id)) {
                return false;
              }
            }

            const backingObjectIdFilter = coerceArray(query.backingObjectId);
            if (backingObjectIdFilter.length > 0) {
              if (!backingObjectIdFilter.includes(object.id)) {
                return false;
              }
            }

            const typenameFilter = coerceArray(query.typename);
            if (typenameFilter.length > 0) {
              if (!typenameFilter.includes(object.typename)) {
                return false;
              }
            }

            if (query.version) {
              if (!query.version.match(/^[0-9.]+$/)) {
                throw new Error('Semver version ranges not supported.');
              }

              if (object.version !== query.version) {
                return false;
              }
            }

            return true;
          })
          // TODO(dmaretskyi): Come up with a better stable sorting method (e.g. [typename, version, id]).
          .sort((a, b) => a.id.localeCompare(b.id))
      );
    };

    const changes = new Event();
    let unsubscribe: CleanupFn | undefined;
    return new SchemaRegistryPreparedQueryImpl({
      changes,
      getResultsSync() {
        const objects = self._db
          .query(Filter.type(StoredSchema))
          .runSync()
          .map((result) => result.object)
          .filter((object) => object != null);

        const results = filterOrderResults(
          objects.map((stored) => {
            return self._register(stored);
          }),
        );
        return results;
      },
      async getResults() {
        const { objects } = await self._db.query(Filter.type(StoredSchema)).run();

        return filterOrderResults(
          objects.map((stored) => {
            return self._register(stored);
          }),
        );
      },
      async start() {
        if (unsubscribe) {
          return;
        }
        unsubscribe = self._subscribe(() => {
          changes.emit();
        });
      },
      async stop() {
        unsubscribe?.();
        unsubscribe = undefined;
      },
    });
  }

  // TODO(burdon): Tighten type signature to TypedObject?
  async register(inputs: RegisterSchemaInput[]): Promise<EchoSchema[]> {
    const results: EchoSchema[] = [];

    // TODO(dmaretskyi): Check for conflicts with the schema in the DB.
    for (const input of inputs) {
      if (Schema.isSchema(input)) {
        results.push(this._addSchema(input));
      } else if (typeof input === 'object' && 'typename' in input && 'version' in input && 'jsonSchema' in input) {
        results.push(
          this._addSchema(
            Type.toEffectSchema({
              ...input.jsonSchema,
              typename: input.typename,
              version: input.version,
            }),
          ),
        );
      } else {
        throw new TypeError('Invalid schema');
      }
    }
    return results;
  }

  public hasSchema(schema: Schema.Schema.AnyNoContext): boolean {
    const schemaId = schema instanceof EchoSchema ? schema.id : getObjectIdFromSchema(schema);
    return schemaId != null && this.getSchemaById(schemaId) != null;
  }

  /**
   * @deprecated Use `query` instead.
   */
  public getSchema(typename: string): EchoSchema | undefined {
    return this.query({ typename }).runSync()[0];
  }

  /**
   * @deprecated Use `query` instead.
   */
  public getSchemaById(id: string): EchoSchema | undefined {
    const existing = this._schemaById.get(id);
    if (existing != null) {
      return existing;
    }

    const typeObject = this._db.getObjectById(id);
    if (typeObject == null) {
      return undefined;
    }

    if (!Schema.is(StoredSchema)(typeObject)) {
      log.warn('type object is not a stored schema', { id: typeObject?.id });
      return undefined;
    }

    return this._register(typeObject);
  }

  /**
   * @internal
   *
   * Registers a StoredSchema object if necessary and returns a EchoSchema object.
   */
  _registerSchema(schema: StoredSchema): EchoSchema {
    const existing = this._schemaById.get(schema.id);
    if (existing != null) {
      return existing;
    }

    const registered = this._register(schema);
    this._notifySchemaListChanged();
    return registered;
  }

  private _register(schema: StoredSchema): EchoSchema {
    const existing = this._schemaById.get(schema.id);
    if (existing != null) {
      return existing;
    }

    let previousTypename: string | undefined;
    const echoSchema = new EchoSchema(schema);
    const subscription = getObjectCore(schema).updates.on(() => {
      echoSchema._invalidate();
    });

    if (previousTypename !== undefined && schema.typename !== previousTypename) {
      if (this._schemaByType.get(previousTypename) === echoSchema) {
        this._schemaByType.delete(previousTypename);
      }
      previousTypename = schema.typename;
      this._schemaByType.set(schema.typename, echoSchema);
      this._notifySchemaListChanged();
    }

    this._schemaById.set(schema.id, echoSchema);
    this._schemaByType.set(schema.typename, echoSchema);
    this._unsubscribeById.set(schema.id, subscription);
    return echoSchema;
  }

  // TODO(dmaretskyi): Figure out how to migrate the usages to the async `register` method.
  private _addSchema(schema: Schema.Schema.AnyNoContext): EchoSchema {
    if (schema instanceof EchoSchema) {
      schema = schema.snapshot.annotations({
        [TypeIdentifierAnnotationId]: undefined,
      });
    }

    const meta = getTypeAnnotation(schema);
    invariant(meta, 'use Schema.Struct({}).pipe(Type.Obj()) or class syntax to create a valid schema');
    const schemaToStore = create(StoredSchema, { ...meta, jsonSchema: toJsonSchema(Schema.Struct({})) });
    const typeId = `dxn:echo:@:${schemaToStore.id}`;
    schemaToStore.jsonSchema = toJsonSchema(
      schema.annotations({
        [TypeAnnotationId]: meta,
        [TypeIdentifierAnnotationId]: typeId,
        [SchemaAST.JSONSchemaAnnotationId]: makeTypeJsonSchemaAnnotation({
          identifier: typeId,
          kind: meta.kind,
          typename: meta.typename,
          version: meta.version,
        }),
      }),
    );

    const storedSchema = this._db.add(schemaToStore);
    const result = this._register(storedSchema);

    this._notifySchemaListChanged();
    result._rebuild();
    return result;
  }

  private _unregister(id: string): void {
    const schema = this._schemaById.get(id);
    if (schema != null) {
      this._schemaById.delete(id);
      this._schemaByType.delete(schema.typename);
      this._unsubscribeById.get(schema.id)?.();
      this._unsubscribeById.delete(schema.id);
    }
  }

  private _subscribe(callback: SchemaSubscriptionCallback): CleanupFn {
    callback([...this._schemaById.values()]);
    this._schemaSubscriptionCallbacks.push(callback);
    return () => {
      const index = this._schemaSubscriptionCallbacks.indexOf(callback);
      if (index >= 0) {
        this._schemaSubscriptionCallbacks.splice(index, 1);
      }
    };
  }

  private _notifySchemaListChanged(): void {
    const list = [...this._schemaById.values()];
    this._schemaSubscriptionCallbacks.forEach((s) => s(list));
  }
}

const coerceArray = <T>(arr: T | T[] | undefined): T[] => {
  if (arr === undefined) {
    return [];
  }
  return Array.isArray(arr) ? arr : [arr];
};

const validateStoredSchemaIntegrity = (schema: StoredSchema) => {
  if (!schema.jsonSchema.$id && !schema.jsonSchema.$id?.startsWith('dxn:')) {
    log.warn('Schema is missing $id or has invalid $id', { schema });
    return false;
  }

  if (schema.jsonSchema.type !== 'object') {
    log.warn('Schema is not of object type', { schema });
    return false;
  }

  return true;
};

const getObjectIdFromSchema = (schema: Schema.Schema.AnyNoContext): ObjectId | undefined => {
  const echoIdentifier = getTypeIdentifierAnnotation(schema);
  if (!echoIdentifier) {
    return undefined;
  }

  const dxn = DXN.parse(echoIdentifier);
  invariant(dxn.isLocalObjectId());
  return dxn.parts[1];
};
