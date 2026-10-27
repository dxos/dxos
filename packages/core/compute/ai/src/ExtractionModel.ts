//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as AiError from 'effect/ai/AiError';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';

//
// An extraction model reads a state and returns one typed value per named field, with its own
// confidence — the "System One" counterpart to `DecisionModel` for values rather than choices.
// Effect has no such service, so it is defined here; Cloudflare's Clairic is the first provider.
//

/** Base of every field: what the field should contain, and when to answer null instead of a guess. */
type FieldBase = {
  readonly instructions?: string;
  /** Probability of null above which the value is null (provider default 0.5). */
  readonly nullThreshold?: number;
};

export type TextField = FieldBase & { readonly type: 'text' };

export type NumberField = FieldBase & {
  readonly type: 'number';
  readonly unit?: string;
  readonly integer?: boolean;
  readonly decimals?: number;
};

export type TemporalField = FieldBase & { readonly type: 'date' | 'time' | 'datetime' };

export type DurationField = FieldBase & {
  readonly type: 'duration';
  readonly unit?: 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years';
  readonly integer?: boolean;
  readonly decimals?: number;
};

export type ListField = FieldBase & { readonly type: 'list'; readonly items: 'text' | 'number' | 'date' };

/** A distribution over a bounded grid, answered by its median and an 80% interval. */
export type EstimateField = FieldBase & {
  readonly type: 'estimate';
  readonly min: number | string;
  readonly max: number | string;
  readonly step?: number | 'month' | 'year';
  readonly scale?: 'linear' | 'log';
};

export type Field = TextField | NumberField | TemporalField | DurationField | ListField | EstimateField;

export type Fields = Readonly<Record<string, Field>>;

/** The value type a field answers with. */
export type ValueOf<F extends Field> = F extends TextField | TemporalField
  ? string
  : F extends NumberField | DurationField
    ? number
    : F extends ListField
      ? F['items'] extends 'number'
        ? readonly number[]
        : readonly string[]
      : F extends EstimateField
        ? number | string
        : never;

/** The spread of an estimate answer. */
export type Estimate = {
  readonly median?: number | string;
  readonly mean?: number | string;
  readonly p10?: number | string;
  readonly p90?: number | string;
};

/** One field's answer. `value` is null when the input does not determine it. */
export type Answer<F extends Field = Field> = {
  readonly value: ValueOf<F> | null;
  /** Confidence in `value`, when the provider reports one. */
  readonly confidence?: number;
  /** Probability the field has no value in this input. */
  readonly pNull?: number;
  /** Estimates only. */
  readonly estimate?: Estimate;
};

export type Answers<Fs extends Fields> = { readonly [K in keyof Fs]: Answer<Fs[K]> };

export type Usage = { readonly inputTokens?: number; readonly outputTokens?: number };

export type Request = {
  readonly state: string;
  readonly fields: Fields;
  /** ISO date that anchors relative and year-less dates ("by Friday"). */
  readonly referenceDate?: string;
};

/** An answer as a provider reports it, before its value is checked against the field's type. */
export type ProviderAnswer = Omit<Answer, 'value'> & { readonly value: unknown };

/** What a provider returns: untyped answers, keyed by field name; a missing field reads as null. */
export type ProviderResult = {
  readonly answers: Readonly<Record<string, ProviderAnswer>>;
  readonly usage?: Usage;
};

export interface Service {
  readonly extract: (request: Request) => Effect.Effect<ProviderResult, AiError.AiError>;
}

export class ExtractionModel extends Context.Service<ExtractionModel, Service>()('@dxos/ai/ExtractionModel') {}

const isScalar = (type: 'text' | 'number' | 'date', value: unknown): boolean =>
  type === 'number' ? typeof value === 'number' : typeof value === 'string';

/** Whether a provider's value has the runtime type its field promises. */
const hasFieldType = (field: Field, value: unknown): boolean => {
  switch (field.type) {
    case 'number':
    case 'duration':
      return typeof value === 'number';
    case 'list':
      return Array.isArray(value) && value.every((item) => isScalar(field.items, item));
    case 'estimate':
      return typeof value === 'number' || typeof value === 'string';
    default:
      return typeof value === 'string';
  }
};

/** A missing answer, or one whose value is the wrong type, reads as null rather than as a bad value. */
const checked = (field: Field, answer: ProviderAnswer | undefined): ProviderAnswer =>
  answer && (answer.value === null || hasFieldType(field, answer.value)) ? answer : { ...answer, value: null };

/** Builds the service from a provider's `extract`. */
export const make = (extract: Service['extract']): Service => ({ extract });

export type ExtractOptions = Omit<Request, 'fields'>;

/**
 * Extracts every field from `state` in one call. Answers are typed by their field; a field the
 * provider did not answer (or answered with the wrong type) is null, so callers never branch on presence.
 */
export const extract: <const Fs extends Fields>(
  fields: Fs,
  options: ExtractOptions,
) => Effect.Effect<{ readonly answers: Answers<Fs>; readonly usage?: Usage }, AiError.AiError, ExtractionModel> =
  Effect.fnUntraced(function* <const Fs extends Fields>(fields: Fs, options: ExtractOptions) {
    const model = yield* ExtractionModel;
    const result = yield* model.extract({ ...options, fields });
    const answers = Object.fromEntries(
      Object.entries(fields).map(([name, field]) => [name, checked(field, result.answers[name])]),
    ) as Answers<Fs>; // Each entry is checked against its field above; TS cannot map `fromEntries` onto `Fs`'s keys.
    return { answers, usage: result.usage };
  });
