//
// Copyright 2026 DXOS.org
//
// Format dispatch for a space that contains BOTH v3-written JSON Schema and
// v4-written SchemaRepresentation documents.
//
// Under one-directional compatibility (v4 reads v3; v3 never reads v4) a migrated
// space is permanently mixed: existing `Type` entities keep their v3 payload until
// rewritten, while new ones are written in the v4 format.
//

import * as Schema from 'effect/Schema';
import * as SR from 'effect/SchemaRepresentation';

import { EchoRevivers, type JsonSchema, toEffectSchema } from './json-schema-compat';

export type StoredSchema = JsonSchema | Schema.Json;

/**
 * A representation document is `{representation, references}`; a v3 JSON Schema document
 * never has those keys, so the two formats are structurally distinguishable without adding
 * a version field to already-written data.
 */
export const isRepresentationDocument = (stored: unknown): boolean =>
  typeof stored === 'object' && stored !== null && 'representation' in stored && 'references' in stored;

/**
 * Reads a stored schema of either vintage.
 */
export const readStoredSchema = (stored: StoredSchema): Schema.Top =>
  isRepresentationDocument(stored)
    ? SR.fromRepresentation(SR.fromJson(stored as Schema.Json), { revivers: EchoRevivers })
    : toEffectSchema(stored as JsonSchema);

/**
 * Writes in the v4-native format. Deliberately not readable by a v3 client.
 */
export const writeStoredSchema = (schema: Schema.Top): Schema.Json => SR.toJson(SR.toRepresentation(schema.ast));
