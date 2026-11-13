//
// Copyright 2026 DXOS.org
//

// Plugin-defined element kinds (COMMON-CORE.md decisions 13 and 21): a layout stores any element over the shared base,
// a kind's own fields sit under the element's `data`, and the registry validates them.

import * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';

/** The outcome of validating an element against its kind: valid, or the kind's schema issue. */
export type KindCheck = { readonly ok: true } | { readonly ok: false; readonly issue: string };

/** An element as a registry reads one: its type and whatever fields it carries. */
export type KindElement = { readonly type?: string; readonly [field: string]: unknown };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The struct a type is, or the one an optional struct's union holds. */
const structOf = (type: SchemaAST.AST | undefined): SchemaAST.Objects | undefined =>
  type === undefined
    ? undefined
    : SchemaAST.isObjects(type)
      ? type
      : SchemaAST.isUnion(type)
        ? type.types.find(SchemaAST.isObjects)
        : undefined;

/** The names of the fields a kind declares under `data`; none where its schema declares no such struct. */
const dataFieldsOf = (schema: Schema.Codec<unknown, unknown>): readonly string[] => {
  const data = structOf(structOf(schema.ast)?.propertySignatures.find(({ name }) => name === 'data')?.type);
  return data?.propertySignatures.map(({ name }) => String(name)) ?? [];
};

/** Element kinds by type, each the full schema of its elements (the base plus the kind's `data`). */
export class KindRegistry {
  readonly #kinds = new Map<string, Schema.Codec<unknown, unknown>>();
  readonly #dataFields = new Map<string, readonly string[]>();

  /** Registers the schema elements of `type` decode with; a later registration of the same type replaces it. */
  register(type: string, schema: Schema.Codec<unknown, unknown>): this {
    this.#kinds.set(type, schema);
    this.#dataFields.set(type, dataFieldsOf(schema));
    return this;
  }

  has(type: string): boolean {
    return this.#kinds.has(type);
  }

  /** The names of the fields `type` keeps under `data`; none for a type that is not registered. */
  dataFields(type: string): readonly string[] {
    return this.#dataFields.get(type) ?? [];
  }

  /**
   * The element with its kind's fields under `data`. An element stored before kinds kept their fields there has them
   * at its top, so each is moved down unless `data` already holds one of that name; any other element is returned as
   * it is.
   */
  normalize(element: KindElement): KindElement {
    const fields = element.type === undefined ? [] : this.dataFields(element.type);
    const moved = fields.filter((field) => field in element);
    if (moved.length === 0) {
      return element;
    }
    const rest = Object.fromEntries(Object.entries(element).filter(([key]) => !moved.includes(key)));
    const top = Object.fromEntries(moved.map((field) => [field, element[field]]));
    return { ...rest, data: { ...top, ...(isRecord(element.data) ? element.data : {}) } };
  }

  /** Checks an element against its kind's schema; an element of an unregistered kind is valid as stored. */
  validate(element: KindElement): KindCheck {
    const schema = element.type === undefined ? undefined : this.#kinds.get(element.type);
    if (!schema) {
      return { ok: true };
    }
    const result = Schema.decodeUnknownResult(schema)(this.normalize(element));
    return Result.isSuccess(result) ? { ok: true } : { ok: false, issue: String(result.failure) };
  }
}
