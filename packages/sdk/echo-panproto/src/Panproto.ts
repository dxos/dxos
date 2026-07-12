//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import initWasm, { transform as wasmTransform } from './wasm/glue.js';
import { WASM_BASE64 } from './wasm/wasm-base64';

//
// Wasm loading. The wasm is base64-inlined (see wasm-base64.ts) so the package is self-contained
// and loads uniformly in Node, Vite, and vitest without bundler wasm configuration.
//

const decodeBase64 = (base64: string): Uint8Array => {
  if (typeof atob === 'function') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }
  return Uint8Array.from((globalThis as any).Buffer.from(base64, 'base64'));
};

let ready: Promise<void> | undefined;
const ensureReady = (): Promise<void> =>
  (ready ??= initWasm({ module_or_path: decodeBase64(WASM_BASE64) }).then(() => undefined));

//
// Expression AST builders. These construct `panproto_expr::Expr` values (serde JSON), so mappings
// are authored as data. Inside a field transform, the field's sibling scalars are bound by name.
//

export type Expr =
  | { Var: string }
  | { Lit: { Str: string } | { Int: number } | { Float: number } | { Bool: boolean } }
  | { Builtin: [string, Expr[]] }
  | { Field: [Expr, string] };

/** Reference a sibling field's value by name. */
export const field = (name: string): Expr => ({ Var: name });
/** A string literal. */
export const str = (value: string): Expr => ({ Lit: { Str: value } });
/** An integer literal. */
export const int = (value: number): Expr => ({ Lit: { Int: value } });
/** A floating-point literal. */
export const float = (value: number): Expr => ({ Lit: { Float: value } });
/** A boolean literal. */
export const bool = (value: boolean): Expr => ({ Lit: { Bool: value } });
/**
 * Invoke a panproto builtin by name. The engine exposes a broad set — arithmetic (`Add`/`Sub`/`Mul`/
 * `Div`/`Mod`/`Neg`/`Abs`/`Floor`/`Ceil`/`Round`), strings (`Concat`/`Len`/`Slice`/`Upper`/`Lower`/
 * `Trim`/`Split`/`Join`/`Replace`/`Contains`), conversions (`IntToFloat`/`FloatToInt`/`IntToStr`/
 * `StrToInt`/…), and more — so uncommon transforms are expressible without a dedicated helper here.
 */
export const builtin = (op: string, args: Expr[]): Expr => ({ Builtin: [op, args] });
/** String concatenation, `Concat(a, b)`. */
export const concat = (...args: Expr[]): Expr => builtin('Concat', args);
/** `Replace(subject, from, to)`. */
export const replace = (subject: Expr, from: string, to: string): Expr => builtin('Replace', [subject, str(from), str(to)]);
/** `Slice(subject, start, end)` over a string's characters (clamped to bounds). */
export const slice = (subject: Expr, start: number, end: number): Expr => builtin('Slice', [subject, int(start), int(end)]);
/** Prefix a string value with a constant, e.g. `reading` → `buzz.bookhive.defs#reading`. */
export const prefix = (value: string, expr: Expr): Expr => concat(str(value), expr);
/** Suffix a string value with a constant, e.g. `2018-11-13` → `2018-11-13T00:00:00.000Z`. */
export const suffix = (value: string, expr: Expr): Expr => concat(expr, str(value));
/** Strip a constant prefix (inverse of {@link prefix}). */
export const stripPrefix = (value: string, expr: Expr): Expr => replace(expr, value, '');

//
// Transform.
//

export type FieldTransform = {
  /** Source vertex (anchor) whose fields the transform reads/writes, e.g. `echo.book:body`. */
  vertex: string;
  /** The scalar field key transformed. */
  key: string;
  /** The expression AST; sibling scalar fields are bound as variables (see {@link field}). */
  expr: Expr;
};

export type MigrationSpec = {
  /** The vertex the record is rooted at, e.g. `echo.book:body`. */
  rootVertex: string;
  /** Scalar value transforms applied by panproto. */
  fieldTransforms: FieldTransform[];
};

export type TransformOptions = {
  /** The lexicon (atproto) describing the record shape. */
  lexicon: Record<string, unknown>;
  /** The declarative transform spec. */
  spec: MigrationSpec;
  /** The record to transform. */
  record: Record<string, unknown>;
};

/**
 * Apply declarative scalar value transforms to a record via panproto's engine (vendored wasm).
 *
 * This covers scalar field rewrites expressible as an {@link Expr} (enum knownValues, rescaling,
 * reformatting). Array/structural reshaping (join/split, flatten/nest) is the caller's concern.
 */
export const transform = async ({ lexicon, spec, record }: TransformOptions): Promise<Record<string, unknown>> => {
  await ensureReady();
  const lexiconJson = JSON.stringify(lexicon);
  const specJson = JSON.stringify({
    root_vertex: spec.rootVertex,
    field_transforms: spec.fieldTransforms.map(({ vertex, key, expr }) => ({ vertex, key, expr })),
  });
  const out = wasmTransform(lexiconJson, lexiconJson, specJson, JSON.stringify(record));
  return JSON.parse(out) as Record<string, unknown>;
};
