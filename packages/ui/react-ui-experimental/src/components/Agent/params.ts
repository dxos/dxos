//
// Copyright 2026 DXOS.org
//

/** A tunable number: its slider range and step. */
export type NumberParam = {
  readonly type: 'number';
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly title?: string;
  readonly description?: string;
};

/** A tunable colour, as `#rrggbb`. */
export type ColorParam = {
  readonly type: 'color';
  readonly title?: string;
  readonly description?: string;
};

export type Param = NumberParam | ColorParam;

/** A visualization's configuration: flat, named numbers and colours. */
export type Config = Record<string, number | string>;

/** The parameter describing each field of a config: a number field has a `NumberParam`, a colour a `ColorParam`. */
export type ParamsOf<C extends Config> = { readonly [K in keyof C]: C[K] extends string ? ColorParam : NumberParam };

export const number = (min: number, max: number, step: number, title?: string): NumberParam => ({
  type: 'number',
  min,
  max,
  step,
  title,
});

export const color = (title?: string): ColorParam => ({ type: 'color', title });

const COLOR = /^#[0-9a-f]{6}$/i;

/** Problems with `config` against `params`: a missing field, a value off its range or step grid, a bad colour. */
export const validate = <C extends Config>(params: ParamsOf<C>, config: Partial<C>): string[] =>
  Object.entries(params).flatMap(([key, param]) => {
    const value = config[key];
    if (value === undefined) {
      return [];
    }
    if (param.type === 'color') {
      return typeof value === 'string' && COLOR.test(value) ? [] : [`${key}: expected #rrggbb, got ${value}`];
    }
    if (typeof value !== 'number' || value < param.min || value > param.max) {
      return [`${key}: expected ${param.min}..${param.max}, got ${value}`];
    }
    return [];
  });

/** A random value for each number param, on its step grid; colours are left alone. */
export const randomize = (params: Readonly<Record<string, Param>>): Config =>
  Object.fromEntries(
    Object.entries(params).flatMap(([key, param]) =>
      param.type === 'number'
        ? [
            [
              key,
              Number(
                (param.min + Math.round((Math.random() * (param.max - param.min)) / param.step) * param.step).toFixed(
                  3,
                ),
              ),
            ],
          ]
        : [],
    ),
  );
