//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

//
// The declarative, serializable lens between an ECHO object and a foreign (e.g. atproto) record.
//
// A lens has two parts:
// - `migration` — an optional panproto structural pass (cross-lexicon vertex/edge alignment: field
//   renames and nesting). panproto executes this; it is what the engine on the `./wasm` entrypoint runs.
// - `adapters` — the ECHO-boundary effects panproto's value-free graph transform cannot express: ref
//   resolution, array<->string, object metadata, and scalar value coercions. The runner executes these.
//
// This module holds ONLY the schema/types (no engine, no `@dxos/echo`) so consumers — e.g. `@dxos/schema`
// carrying the lens as a serializable annotation — can import it without loading the wasm engine.
//

/** A path into an ECHO object (the argument to `Obj.getValue`/`Obj.setValue`). */
const Path = Schema.Array(Schema.String);

/** A parsed atproto lexicon document (opaque JSON; embedded so the lens is self-contained). */
const Lexicon = Schema.Record({ key: Schema.String, value: Schema.Unknown });

/**
 * A ref-typed ECHO field carried on the wire as a plain string. `format` names a registered text
 * codec (e.g. `markdown-html`); `refType` names a registered ref factory used on decode; `alwaysCreate`
 * materializes an (empty) ref even when the wire carries no value.
 */
const RefText = Schema.Struct({
  refType: Schema.String,
  format: Schema.optional(Schema.String),
  alwaysCreate: Schema.optional(Schema.Boolean),
});

/**
 * A single field adapter mapping one wire property to/from the ECHO object. Exactly one tag per adapter:
 * - `scalar` — copy a value verbatim.
 * - `array` — join an ECHO string array to a separated wire string (split on decode).
 * - `ref` — resolve an ECHO `Ref<Text>` to its content (encode via `format`), rebuild on decode.
 * - `meta` — read an ECHO object-metadata field (e.g. `createdAt`); encode-only, dropped on decode.
 * - `prefix` — prepend a constant on encode, strip it on decode (e.g. a knownValue namespace).
 * - `dateOnly` — widen a date-only value to an ISO datetime on encode, narrow on decode.
 * - `timestamp` — copy an ISO datetime, defaulting a missing value to an object-metadata field
 *   (`fallbackMeta`) so a required wire timestamp is always present.
 * - `struct` — a nested object whose sub-fields are themselves adapters (e.g. `identifiers`).
 * - `derive` — synthesize a wire-only value from an ECHO path via a `${'{0}'}`-style template
 *   (e.g. `hiveBookUri`); dropped on decode.
 */
export const Adapter: Schema.Schema<Adapter> = Schema.Union(
  Schema.Struct({ kind: Schema.Literal('scalar'), wire: Schema.String, echo: Path }),
  Schema.Struct({ kind: Schema.Literal('array'), wire: Schema.String, echo: Path, separator: Schema.String }),
  Schema.Struct({ kind: Schema.Literal('ref'), wire: Schema.String, echo: Path, ref: RefText }),
  Schema.Struct({ kind: Schema.Literal('meta'), wire: Schema.String, metaField: Schema.String }),
  Schema.Struct({ kind: Schema.Literal('prefix'), wire: Schema.String, echo: Path, prefix: Schema.String }),
  Schema.Struct({ kind: Schema.Literal('dateOnly'), wire: Schema.String, echo: Path }),
  Schema.Struct({ kind: Schema.Literal('timestamp'), wire: Schema.String, echo: Path, fallbackMeta: Schema.optional(Schema.String) }),
  Schema.Struct({ kind: Schema.Literal('struct'), wire: Schema.String, fields: Schema.Array(Schema.suspend(() => Adapter)) }),
  Schema.Struct({ kind: Schema.Literal('derive'), wire: Schema.String, from: Path, template: Schema.String }),
);

export type Adapter =
  | { readonly kind: 'scalar'; readonly wire: string; readonly echo: readonly string[] }
  | { readonly kind: 'array'; readonly wire: string; readonly echo: readonly string[]; readonly separator: string }
  | {
      readonly kind: 'ref';
      readonly wire: string;
      readonly echo: readonly string[];
      readonly ref: { readonly refType: string; readonly format?: string; readonly alwaysCreate?: boolean };
    }
  | { readonly kind: 'meta'; readonly wire: string; readonly metaField: string }
  | { readonly kind: 'prefix'; readonly wire: string; readonly echo: readonly string[]; readonly prefix: string }
  | { readonly kind: 'dateOnly'; readonly wire: string; readonly echo: readonly string[] }
  | { readonly kind: 'timestamp'; readonly wire: string; readonly echo: readonly string[]; readonly fallbackMeta?: string }
  | { readonly kind: 'struct'; readonly wire: string; readonly fields: readonly Adapter[] }
  | { readonly kind: 'derive'; readonly wire: string; readonly from: readonly string[]; readonly template: string };

/**
 * The optional panproto structural pass. `sourceVertex`/`targetVertex` are the record body vertices
 * (`<lexicon-id>:body`); `renames` maps a source property name to a differently-named target property.
 * Unnamed correspondences are aligned by shared property name.
 */
export const Migration = Schema.Struct({
  sourceLexicon: Lexicon,
  targetLexicon: Lexicon,
  sourceVertex: Schema.String,
  targetVertex: Schema.String,
  renames: Schema.optional(Schema.Array(Schema.Struct({ from: Schema.String, to: Schema.String }))),
});
export type Migration = Schema.Schema.Type<typeof Migration>;

/** A declarative, serializable ECHO<->foreign-record lens. */
export const Lens = Schema.Struct({
  adapters: Schema.Array(Adapter),
  migration: Schema.optional(Migration),
  /** Wire keys dropped when their encoded value is empty/undefined (the egress gate). */
  gate: Schema.optional(Schema.Array(Schema.String)),
});
export type Lens = Schema.Schema.Type<typeof Lens>;
