//
// Copyright 2026 DXOS.org
//

import { createTV } from 'tailwind-variants';

import { type ClassNameArray, type ClassNameValue, type Theme } from '@dxos/ui-types';

import { twMergeConfig } from './tw-merge-config';

export type { VariantProps } from 'tailwind-variants';

/**
 * Shared tailwind-variants instance bound to the dxos tailwind-merge config (see {@link twMergeConfig}),
 * so recipes resolve class conflicts identically to {@link mx}. All component theme recipes import this,
 * never the bare `tailwind-variants` package.
 */
export const tv = createTV({ twMerge: true, twMergeConfig });

type SlotsRecipe<P extends Record<string, any>, S extends string> = (
  props?: P,
) => Record<S, (opts?: { class?: ClassNameValue }) => string>;

/**
 * Adapt a tailwind-variants slots recipe into the existing {@link Theme} shape (a map of
 * {@link import('@dxos/ui-types').ComponentFunction}) so it can register in the `tx` theme tree and be
 * consumed via `tx('component.slot', styleProps, ...classNames)`. Slots are enumerated explicitly (not
 * via Proxy) so unknown paths resolve to `undefined` exactly as `getDeep` does today, and the result is
 * a plain, inspectable object. Derive `slots` from `Object.keys(recipe())` at the call site.
 */
export const bridgeTv = <P extends Record<string, any>, S extends string>(
  recipe: SlotsRecipe<P, S>,
  slots: readonly S[],
): Theme<P> =>
  Object.fromEntries(
    slots.map((slot) => [slot, (styleProps: P, ...etc: ClassNameArray) => recipe(styleProps)[slot]({ class: etc })]),
  ) as Theme<P>;
