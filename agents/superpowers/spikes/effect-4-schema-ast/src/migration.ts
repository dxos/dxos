//
// Copyright 2026 DXOS.org
//
// Prototype of the `org.dxos.type.schema` 0.1.0 -> 0.2.0 ECHO migration.
//
// `Type.Type` entities store `{ name?, jsonSchema }`. The migration rewrites the `jsonSchema`
// payload from the v3 JSON Schema encoding to the v4 `SchemaRepresentation` encoding. Only the
// transform is modelled here — wiring it to `Migration.define` / `Database.runMigrations`
// needs a live database and belongs with the real port.
//

import type * as Schema from 'effect/Schema';

import { isRepresentationDocument, readStoredSchema, writeStoredSchema } from './dispatch';

export const TYPE_SCHEMA_TYPENAME = 'org.dxos.type.schema';
export const FROM_VERSION = '0.1.0';
export const TO_VERSION = '0.2.0';

export const fromType = `dxn:${TYPE_SCHEMA_TYPENAME}:${FROM_VERSION}`;
export const toType = `dxn:${TYPE_SCHEMA_TYPENAME}:${TO_VERSION}`;

/** The stored shape of a `Type.Type` entity (`TypeSchemaStruct`). */
export type StoredType = {
  readonly name?: string;
  readonly jsonSchema: Record<string, any> | Schema.Json;
};

/**
 * Idempotent by construction: a payload already in the v4 encoding is returned untouched, so a
 * migration that runs twice — or against a space another peer already migrated — is a no-op.
 */
export const transform = (entity: StoredType): StoredType => {
  if (isRepresentationDocument(entity.jsonSchema)) {
    return entity;
  }
  return { ...entity, jsonSchema: writeStoredSchema(readStoredSchema(entity.jsonSchema as any)) };
};

/** Reads a `Type.Type` entity of either vintage into a live v4 schema. */
export const getSchema = (entity: StoredType) => readStoredSchema(entity.jsonSchema as any);
