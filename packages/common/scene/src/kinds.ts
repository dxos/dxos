//
// Copyright 2026 DXOS.org
//

// Plugin-defined element kinds (COMMON-CORE.md decision 13): a layout stores any element over the shared base, and
// the registry validates each registered kind's own fields.

import * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';

/** The outcome of validating an element against its kind: valid, or the kind's schema issue. */
export type KindCheck = { readonly ok: true } | { readonly ok: false; readonly issue: string };

/** Element kinds by type, each the full schema of its elements (the base plus the kind's own fields). */
export class KindRegistry {
  readonly #kinds = new Map<string, Schema.Codec<unknown, unknown>>();

  /** Registers the schema elements of `type` decode with; a later registration of the same type replaces it. */
  register(type: string, schema: Schema.Codec<unknown, unknown>): this {
    this.#kinds.set(type, schema);
    return this;
  }

  has(type: string): boolean {
    return this.#kinds.has(type);
  }

  /** Checks an element against its kind's schema; an element of an unregistered kind is valid as stored. */
  validate(element: { readonly type?: string; readonly [field: string]: unknown }): KindCheck {
    const schema = element.type === undefined ? undefined : this.#kinds.get(element.type);
    if (!schema) {
      return { ok: true };
    }
    const result = Schema.decodeUnknownResult(schema)(element);
    return Result.isSuccess(result) ? { ok: true } : { ok: false, issue: String(result.failure) };
  }
}
