//
// Copyright 2026 DXOS.org
//

import { type Config, type Param } from '../params.ts';

type LevaInput =
  | { value: number; min: number; max: number; step: number; label: string }
  | { value: string; label: string };

/**
 * Leva controls for a visualization's params, starting at `values`: a slider for each number (its range and step), a
 * colour picker for each colour.
 */
export const levaControls = (params: Readonly<Record<string, Param>>, values: Config): Record<string, LevaInput> =>
  Object.fromEntries(
    Object.entries(params).flatMap(([key, param]): [string, LevaInput][] => {
      const value = values[key];
      const label = param.title ?? key;
      if (param.type === 'number') {
        return typeof value === 'number'
          ? [[key, { value, min: param.min, max: param.max, step: param.step, label }]]
          : [];
      }
      return typeof value === 'string' ? [[key, { value, label }]] : [];
    }),
  );

/** The config in Leva's values: its numbers and strings (Leva cannot infer value types through a dynamic schema). */
export const toConfig = (values: Record<string, unknown>): Config =>
  Object.fromEntries(
    Object.entries(values).flatMap(([key, value]): [string, number | string][] =>
      typeof value === 'number' || typeof value === 'string' ? [[key, value]] : [],
    ),
  );

/** Leva store paths for `config`'s fields in the folder `folder`. */
export const levaPaths = (folder: string, config: Config): Record<string, number | string> =>
  Object.fromEntries(Object.entries(config).map(([key, value]) => [`${folder}.${key}`, value]));

/** `defaults` with each field Leva holds a value of the same kind for replaced by that value. */
export const applyValues = <C extends Config>(defaults: C, values: Config): C =>
  Object.assign(
    { ...defaults },
    Object.fromEntries(Object.entries(values).filter(([key, value]) => typeof value === typeof defaults[key])),
  );
