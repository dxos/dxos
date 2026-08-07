//
// Copyright 2025 DXOS.org
//

import type * as Effect from 'effect/Effect';

import { createAnnotationHelper } from '@dxos/echo/internal';

/** One selectable option produced by an {@link OptionsLookup}. */
export type OptionsLookupEntry = { value: string; label?: string; secondaryLabel?: string; icon?: string };

/**
 * Loads a select field's options dynamically from a declared subset of the form values, so a select can
 * depend on a sibling field (e.g. publications for a typed handle). `deps` are the field names the loader
 * reads; the form re-runs it only when one of those values changes. The returned Effect must be
 * self-contained (`R = never`): it provides its own dependencies (network layer, etc.) in the closure.
 * Construct via {@link optionsLookup} for typed `deps`/`values`. Pass `{ combobox: true }` to render
 * an editable combobox (type-to-search) instead of a constrained select.
 */
export type OptionsLookup = {
  readonly deps: readonly string[];
  readonly load: (values: any) => Effect.Effect<readonly OptionsLookupEntry[], unknown>;
  readonly combobox?: boolean;
};

export const OptionsLookupAnnotationId = Symbol.for('@dxos/schema/annotation/OptionsLookup');
export const OptionsLookupAnnotation = createAnnotationHelper<OptionsLookup>(OptionsLookupAnnotationId);

/**
 * Builds an {@link OptionsLookup} typed against a schema's value type `Values`: `deps` is checked
 * against its field names, and `load` receives only those fields, narrowed. Pass `{ combobox: true }` to
 * render an editable combobox.
 */
export const optionsLookup =
  <Values>() =>
  <const Deps extends readonly (keyof Values & string)[]>(
    deps: Deps,
    load: (values: Pick<Values, Deps[number]>) => Effect.Effect<readonly OptionsLookupEntry[], unknown>,
    options?: { combobox?: boolean },
  ): OptionsLookup => ({ deps, load, combobox: options?.combobox });

/**
 * Derives a (text) field's value from a declared subset of the form values, so a field can be pre-filled
 * from a sibling (e.g. a feed name fetched from a typed URL). `deps` are the field names the derivation
 * reads; the form re-runs it only when one of those changes. The returned Effect must be self-contained
 * (`R = never`); `undefined` means "no value to fill". The form pre-fills only while the user has not
 * typed their own value, so a manual edit is never clobbered. Construct via {@link autofill}.
 */
export type Autofill = {
  readonly deps: readonly string[];
  readonly derive: (values: any) => Effect.Effect<string | undefined, unknown>;
};

export const AutofillAnnotationId = Symbol.for('@dxos/schema/annotation/Autofill');
export const AutofillAnnotation = createAnnotationHelper<Autofill>(AutofillAnnotationId);

/** Builds an {@link Autofill} typed against a schema's value type `Values` (see {@link optionsLookup}). */
export const autofill =
  <Values>() =>
  <const Deps extends readonly (keyof Values & string)[]>(
    deps: Deps,
    derive: (values: Pick<Values, Deps[number]>) => Effect.Effect<string | undefined, unknown>,
  ): Autofill => ({ deps, derive });
