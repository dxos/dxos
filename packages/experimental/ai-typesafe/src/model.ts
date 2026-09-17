//
// Copyright 2026 DXOS.org
//

/** A behaviour a model either supports or does not; requesting an undeclared one is a type error. */
export type Capability = 'tools' | 'thinking' | 'image' | 'documents' | 'structuredOutput';

/**
 * A model carrying its declared capabilities in its type, so that a request the model cannot serve
 * fails at the call site rather than at the provider.
 */
export type Model<Id extends string = string, Caps extends Capability = Capability> = {
  readonly id: Id;
  readonly label: string;
  readonly contextWindow: number;
  readonly capabilities: readonly Caps[];
};

/** The capability union of a model type. */
export type CapabilityOf<M extends Model> = M extends Model<string, infer Caps> ? Caps : never;

/**
 * The members of a model union that declare every capability in `Required`. A model's capability
 * list is a literal tuple, so plain assignability would demand an exact match — this asks the
 * weaker, useful question: does it support at least these?
 */
export type Supporting<M extends Model, Required extends Capability> = M extends Model
  ? [Required] extends [CapabilityOf<M>]
    ? M
    : never
  : never;

/** The id of a model type. */
export type IdOf<M extends Model> = M extends Model<infer Id, Capability> ? Id : never;

/**
 * Defines a model, preserving its id and capabilities as literal types.
 */
export const defineModel = <const Id extends string, const Caps extends readonly Capability[]>(spec: {
  readonly id: Id;
  readonly label: string;
  readonly contextWindow: number;
  readonly capabilities: Caps;
}): Model<Id, Caps[number]> => spec;

/** Narrows a model to one declaring every requested capability, at compile time and at runtime. */
export const requireCapabilities = <M extends Model, const Required extends readonly CapabilityOf<M>[]>(
  model: M,
  capabilities: Required,
): M => {
  const missing = capabilities.filter((capability) => !model.capabilities.includes(capability));
  if (missing.length > 0) {
    throw new Error(`Model ${model.id} is missing capabilities: ${missing.join(', ')}`);
  }

  return model;
};

/** True when the model declares the capability. */
export const supports = <M extends Model>(model: M, capability: Capability): capability is CapabilityOf<M> =>
  (model.capabilities as readonly Capability[]).includes(capability);
