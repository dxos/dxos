//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as SchemaRepresentation from 'effect/SchemaRepresentation';

import { REF_REPRESENTATION_ID, createEchoReferenceSchema } from '../Ref/ref';

/**
 * `SchemaRepresentation` is Effect 4's bidirectional, persistable schema encoding. Unlike the JSON
 * Schema path it round-trips declarations and checks losslessly, which is what ECHO needs to store a
 * `Ref` without dropping its target.
 *
 * Revivers are explicit — there is no global registry, and a document that mentions an id with no
 * matching reviver fails to load. Anything a persisted ECHO schema can contain must be listed here.
 */

/**
 * Payload persisted for an ECHO `Ref` declaration: the resolved target URI and version.
 *
 * Deliberately not the constructor arguments — a reference built from a `typename` and one built
 * from the equivalent `echoUri` are the same reference, and must persist identically.
 */
const RefPayload = Schema.Struct({
  target: Schema.String,
  version: Schema.NullOr(Schema.String),
});

const RefReviver = SchemaRepresentation.makeDeclarationReviver(REF_REPRESENTATION_ID, RefPayload, ({ payload }) =>
  createEchoReferenceSchema(payload.target, undefined, payload.version ?? undefined),
);

/**
 * Revivers for everything an ECHO schema can persist.
 *
 * Effect's own checks need listing too — none are installed implicitly, and a missing one fails the
 * load outright (`Missing reviver for effect/schema/isPattern`) rather than degrading quietly. The
 * built-ins below are every check reachable from `Format` and the constraint helpers ECHO exposes;
 * `representation.test.ts` covers the stored corpus, so a gap shows up there rather than in a space.
 */
export const EchoRevivers: ReadonlyArray<SchemaRepresentation.AnyReviver> = [
  RefReviver,

  // String shape.
  Schema.isPatternReviver,
  Schema.isMinLengthReviver,
  Schema.isMaxLengthReviver,
  Schema.isLengthBetweenReviver,
  Schema.isTrimmedReviver,
  Schema.isLowercasedReviver,
  Schema.isUppercasedReviver,
  Schema.isCapitalizedReviver,
  Schema.isUncapitalizedReviver,
  Schema.isStartsWithReviver,
  Schema.isEndsWithReviver,
  Schema.isIncludesReviver,

  // Identifier formats.
  Schema.isULIDReviver,
  Schema.isUUIDReviver,
  Schema.isGUIDReviver,
  Schema.isBase64Reviver,
  Schema.isBase64UrlReviver,

  // Numeric bounds.
  Schema.isIntReviver,
  Schema.isFiniteReviver,
  Schema.isMultipleOfReviver,
  Schema.isBetweenReviver,
  Schema.isGreaterThanReviver,
  Schema.isGreaterThanOrEqualToReviver,
  Schema.isLessThanReviver,
  Schema.isLessThanOrEqualToReviver,

  // Collections and objects.
  Schema.isMinSizeReviver,
  Schema.isMaxSizeReviver,
  Schema.isSizeBetweenReviver,
  Schema.isUniqueReviver,
  Schema.isMinPropertiesReviver,
  Schema.isMaxPropertiesReviver,
  Schema.isPropertiesLengthBetweenReviver,
];

/**
 * Serializes a schema to the persistable representation encoding.
 *
 * Round-trips with {@link fromRepresentationJson}; see `representation.test.ts`, which asserts that
 * over the whole stored-type corpus.
 */
export const toRepresentationJson = (schema: Schema.Top): Schema.Json =>
  SchemaRepresentation.toJson(SchemaRepresentation.toRepresentation(schema.ast));

/** Rebuilds a schema from {@link toRepresentationJson} output. */
export const fromRepresentationJson = (json: Schema.Json): Schema.Top =>
  SchemaRepresentation.fromRepresentation(SchemaRepresentation.fromJson(json), { revivers: EchoRevivers });

/**
 * Whether a stored payload is a representation document rather than a v3 JSON Schema one.
 *
 * The two are structurally distinguishable — a representation document carries
 * `{ representation, references }`, which a JSON Schema document never has — so no version field
 * has to be added to already-written data.
 */
export const isRepresentationDocument = (value: unknown): boolean =>
  typeof value === 'object' && value !== null && 'representation' in value && 'references' in value;
