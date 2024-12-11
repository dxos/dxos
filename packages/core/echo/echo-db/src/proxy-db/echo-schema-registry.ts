//
// Copyright 2024 DXOS.org
//

import { Event, type UnsubscribeCallback } from '@dxos/async';
import { Resource, type Context } from '@dxos/context';
import {
  EchoIdentifierAnnotationId,
  EchoSchema,
  getEchoIdentifierAnnotation,
  getObjectAnnotation,
  ObjectAnnotationId,
  StoredSchema,
  toJsonSchema,
  type ObjectId,
  type S,
} from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import { createStoredSchema } from '@dxos/live-object';
import { log } from '@dxos/log';

import { type EchoDatabase } from './database';
import type {
  RegisterSchemaInput,
  SchemaRegistry,
  SchemaRegistryPreparedQuery,
  SchemaRegistryQuery,
  SchemaSubscriptionCallback,
} from './schema-registry-api';
import { SchemaRegistryPreparedQueryImpl } from './schema-registry-prepared-query';
import { getObjectCore } from '../echo-handler';
import { Filter } from '../query';

export type EchoSchemaRegistryOptions = {
  /**
   * Run a reactive query for dynamic schemas.
   * @default true
   */
  reactiveQuery?: boolean;
};

/**
 * Per-space set of mutable schemas.
 */
// TODO(burdon): Reconcile with RuntimeSchemaRegistry.
export class EchoSchemaRegistry extends Resource implements SchemaRegistry {
  private readonly _reactiveQuery: boolean;

  private readonly _schemaById: Map<string, EchoSchema> = new Map();
  private readonly _schemaByType: Map<string, EchoSchema> = new Map();
  private readonly _unsubscribeById: Map<string, UnsubscribeCallback> = new Map();
  private readonly _schemaSubscriptionCallbacks: SchemaSubscriptionCallback[] = [];

  constructor(
    private readonly _db: EchoDatabase,
    { reactiveQuery = true }: EchoSchemaRegistryOptions = {},
  ) {
    super();
    this._reactiveQuery = reactiveQuery;
  }

  protected override async _open(ctx: Context): Promise<void> {
    // Preload schemas.
    const { objects } = await this._db.query(Filter.schema(StoredSchema)).run();
    objects.forEach((object) => this._registerSchema(object));

    if (this._reactiveQuery) {
      const unsubscribe = this._db.query(Filter.schema(StoredSchema)).subscribe(({ objects }) => {
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
      log.debug('Filtering schemas', { schemas, query });
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
    let unsubscribe: UnsubscribeCallback | undefined;
    return new SchemaRegistryPreparedQueryImpl({
      changes,
      getResultsSync() {
        return filterOrderResults([...self._schemaById.values()]);
      },
      async getResults() {
        const { objects } = await self._db.query(Filter.schema(StoredSchema)).run();

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

  async register(inputs: RegisterSchemaInput[]): Promise<EchoSchema[]> {
    const results: EchoSchema[] = [];

    // TODO(dmaretskyi): Check for conflicts with the schema in the DB.
    for (const input of inputs) {
      if (!input.schema && !input.jsonSchema) {
        throw new TypeError('schema or jsonSchema is required');
      }
      if (input.jsonSchema) {
        throw new Error('jsonSchema is not supported');
      }
      results.push(this.addSchema(input.schema!));
    }
    return results;
  }

  public hasSchema(schema: S.Schema<any>): boolean {
    const schemaId = schema instanceof EchoSchema ? schema.id : getObjectIdFromSchema(schema);
    return schemaId != null && this.getSchemaById(schemaId) != null;
  }

  public getSchema(typename: string): EchoSchema | undefined {
    return this.query({ typename }).runSync()[0];
  }

  public getSchemaById(id: string): EchoSchema | undefined {
    const existing = this._schemaById.get(id);
    if (existing != null) {
      return existing;
    }

    const typeObject = this._db.getObjectById(id);
    if (typeObject == null) {
      return undefined;
    }

    if (!(typeObject instanceof StoredSchema)) {
      log.warn('type object is not a stored schema', { id: typeObject?.id });
      return undefined;
    }

    return this._register(typeObject);
  }

  // TODO(burdon): Tighten type signature to TypedObject?
  // TODO(dmaretskyi): Figure out how to migrate the usages to the async `register` method.
  public addSchema(schema: S.Schema<any>): EchoSchema {
    if (schema instanceof EchoSchema) {
      schema = schema.getSchemaSnapshot().annotations({
        [EchoIdentifierAnnotationId]: undefined,
      });
    }

    const meta = getObjectAnnotation(schema);
    invariant(meta, 'use S.Struct({}).pipe(EchoObject(...)) or class syntax to create a valid schema');
    const schemaToStore = createStoredSchema(meta);
    const updatedSchema = schema.annotations({
      [ObjectAnnotationId]: meta,
      [EchoIdentifierAnnotationId]: `dxn:echo:@:${schemaToStore.id}`,
    });

    schemaToStore.jsonSchema = toJsonSchema(updatedSchema);
    const storedSchema = this._db.add(schemaToStore);
    const result = this._register(storedSchema);
    this._notifySchemaListChanged();
    result._rebuild();
    return result;
  }

  /**
   * @deprecated
   */
  // TODO(dmaretskyi): Only used in tests -- remove.
  public registerSchema(schema: StoredSchema): EchoSchema {
    return this._registerSchema(schema);
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

  private _unregister(id: string) {
    const schema = this._schemaById.get(id);
    if (schema != null) {
      this._schemaById.delete(id);
      this._schemaByType.delete(schema.typename);
      this._unsubscribeById.get(schema.id)?.();
      this._unsubscribeById.delete(schema.id);
    }
  }

  private _subscribe(callback: SchemaSubscriptionCallback): UnsubscribeCallback {
    callback([...this._schemaById.values()]);
    this._schemaSubscriptionCallbacks.push(callback);
    return () => {
      const index = this._schemaSubscriptionCallbacks.indexOf(callback);
      if (index >= 0) {
        this._schemaSubscriptionCallbacks.splice(index, 1);
      }
    };
  }

  private _notifySchemaListChanged() {
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

const getObjectIdFromSchema = (schema: S.Schema<any>): ObjectId | undefined => {
  const echoIdentifier = getEchoIdentifierAnnotation(schema);
  if (!echoIdentifier) {
    return undefined;
  }

  const dxn = DXN.parse(echoIdentifier);
  invariant(dxn.isLocalObjectId());
  return dxn.parts[1];
};
