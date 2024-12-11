import type { JsonSchemaType, StoredSchema } from '@dxos/echo-schema';
import {
  toEffectSchema,
  S,
  AST,
  setTypenameInSchema,
  toJsonSchema,
  addFieldsToSchema,
  updateFieldsInSchema,
  updateFieldNameInSchema,
  removeFieldsFromSchema,
} from '@dxos/echo-schema';
import type { ReactiveEchoObject } from '../echo-handler';
import type { AnyEchoObjectSchema, SchemaId, SchemaRecord } from './schema-registry-api';
import { invariant } from '@dxos/invariant';
import { getSnapshot } from '@dxos/live-object';

// TODO(dmaretskyi): Replaces MutableSchema, StaticSchema.
export class SchemaRecordImpl implements SchemaRecord {
  // TODO(dmaretskyi): Schema can be potentially initialized with a json-schema snapshot instead of a live echo object.
  constructor(
    private readonly _id: SchemaId,
    private readonly _backingObject: ReactiveEchoObject<StoredSchema> | undefined,
  ) {}

  get id(): SchemaId {
    return this._id;
  }

  get mutable(): boolean {
    throw new Error('Method not implemented.');
  }

  getSchema(): AnyEchoObjectSchema {
    return toEffectSchema(this.getJsonSchema());
  }

  getJsonSchema(): JsonSchemaType {
    invariant(this._backingObject);
    return getSnapshot(this._backingObject.jsonSchema);
  }

  async getBackingObject(): Promise<ReactiveEchoObject<StoredSchema> | undefined> {
    return this._backingObject;
  }

  // TODO(dmaretskyi): Do not overwrite the entire JSON-schema.
  async updateTypename(typename: string): Promise<void> {
    const updated = setTypenameInSchema(this.getSchema(), typename);
    invariant(this._backingObject);
    this._backingObject.typename = typename;
    this._backingObject.jsonSchema = toJsonSchema(updated);
  }

  /**
   * Adds fields.
   *
   * @throws Error if schema is not mutable.
   */
  // TODO(dmaretskyi): Do not overwrite the entire JSON-schema.
  async addFields(fields: S.Struct.Fields): Promise<void> {
    const extended = addFieldsToSchema(this.getSchema(), fields);
    invariant(this._backingObject);
    this._backingObject.jsonSchema = toJsonSchema(extended);
  }

  /**
   * Updates fields.
   *
   * @throws Error if schema is not mutable.
   */
  // TODO(dmaretskyi): Do not overwrite the entire JSON-schema.
  async updateFields(fields: S.Struct.Fields): Promise<void> {
    const updated = updateFieldsInSchema(this.getSchema(), fields);
    invariant(this._backingObject);
    this._backingObject.jsonSchema = toJsonSchema(updated);
  }

  // TODO(dmaretskyi): Do not overwrite the entire JSON-schema.
  async renameField({ from, to }: { from: string; to: string }): Promise<void> {
    const renamed = updateFieldNameInSchema(this.getSchema(), { before: from, after: to });
    invariant(this._backingObject);
    this._backingObject.jsonSchema = toJsonSchema(renamed);
  }

  // TODO(dmaretskyi): Do not overwrite the entire JSON-schema.
  async removeFields(fieldNames: string[]): Promise<void> {
    const removed = removeFieldsFromSchema(this.getSchema(), fieldNames);
    invariant(this._backingObject);
    this._backingObject.jsonSchema = toJsonSchema(removed);
  }
}
