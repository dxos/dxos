import type { JsonSchemaType, StoredSchema } from '@dxos/echo-schema';
import { toEffectSchema, S, AST } from '@dxos/echo-schema';
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

  updateTypename(typename: string): Promise<void> {
    throw new Error('Method not implemented.');
  }

  /**
   * Adds fields.
   *
   * @throws Error if schema is not mutable.
   */
  addFields(fields: S.Struct.Fields): Promise<void> {
    throw new Error('Method not implemented.');
  }

  /**
   * Updates fields.
   *
   * @throws Error if schema is not mutable.
   */
  updateFields(fields: S.Struct.Fields): Promise<void> {
    throw new Error('Method not implemented.');
  }

  renameField({ from, to }: { from: string; to: string }): Promise<void> {
    throw new Error('Method not implemented.');
  }
  removeFields(fieldNames: string[]): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
