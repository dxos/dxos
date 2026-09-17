//
// Copyright 2026 DXOS.org
//

import { type Capability, type CapabilityOf, type IdOf, type Model, type Supporting } from './model.ts';

/** A catalog indexed by model id, so a lookup returns the specific model type, not the union. */
export type Catalog<M extends Model> = {
  readonly models: readonly M[];
  readonly get: <Id extends IdOf<M>>(id: Id) => Extract<M, Model<Id, Capability>>;
  readonly withCapability: <Cap extends CapabilityOf<M>>(capability: Cap) => Supporting<M, Cap>[];
};

/** Builds a catalog from models; duplicate ids are rejected. */
export const defineCatalog = <const M extends readonly Model[]>(models: M): Catalog<M[number]> => {
  const index = new Map<string, M[number]>();
  for (const model of models) {
    if (index.has(model.id)) {
      throw new Error(`Duplicate model id: ${model.id}`);
    }
    index.set(model.id, model);
  }

  return {
    models,
    get: (id) => {
      const model = index.get(id);
      if (!model) {
        throw new Error(`Unknown model: ${id}`);
      }

      return model as Extract<M[number], Model<typeof id, Capability>>;
    },
    withCapability: (capability) =>
      models.filter((model) => (model.capabilities as readonly Capability[]).includes(capability)) as Supporting<
        M[number],
        typeof capability
      >[],
  };
};
