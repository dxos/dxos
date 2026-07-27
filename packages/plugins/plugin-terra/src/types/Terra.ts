//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/Annotation';

import { type TerraConfigValues } from '../engine';

/** Deterministic parameters for a Terra world. All fields optional so a bare seed works. */
export const TerraConfig = Schema.Struct({
  seed: Schema.optional(Schema.String.annotations({ title: 'Seed' })),
  resolution: Schema.optional(Schema.Number.annotations({ title: 'Resolution' })),
  elevationScale: Schema.optional(Schema.Number.annotations({ title: 'Elevation scale' })),
  frequency: Schema.optional(Schema.Number),
  octaves: Schema.optional(Schema.Number),
  persistence: Schema.optional(Schema.Number),
  lacunarity: Schema.optional(Schema.Number),
  continentPower: Schema.optional(Schema.Number),
  mountainScale: Schema.optional(Schema.Number.annotations({ title: 'Mountain scale' })),
  maskFrequency: Schema.optional(Schema.Number),
  maskThreshold: Schema.optional(Schema.Number),
  waterLevel: Schema.optional(Schema.Number.annotations({ title: 'Water level' })),
  landGain: Schema.optional(Schema.Number),
  oceanDepthBias: Schema.optional(Schema.Number),
  beachWidth: Schema.optional(Schema.Number),
  treeLine: Schema.optional(Schema.Number),
  poles: Schema.optional(Schema.Boolean),
  snowLine: Schema.optional(Schema.Number),
  snowElevation: Schema.optional(Schema.Number),
  treeDensity: Schema.optional(Schema.Number.annotations({ title: 'Tree density' })),
  rockDensity: Schema.optional(Schema.Number),
  trees: Schema.optional(Schema.Boolean),
  rocks: Schema.optional(Schema.Boolean),
});

export type TerraConfig = Schema.Schema.Type<typeof TerraConfig>;

/** A Terra world storing generation parameters; `Terra.toConfigValues` merges them over defaults for the engine. */
export class Terra extends Type.makeObject<Terra>(DXN.make('org.dxos.type.terra', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    config: TerraConfig,
  }).pipe(
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--globe-hemisphere-west--regular', hue: 'green' }),
  ),
) {}

/** Default generation parameters (spike-validated). `radius` is fixed for the orbit view and excluded from `TerraConfig`. */
export const defaultConfig = (): Required<Omit<TerraConfigValues, 'seed'>> & { seed: string } => ({
  seed: 'terra',
  radius: 2,
  resolution: 256,
  elevationScale: 0.16,
  frequency: 0.9,
  octaves: 6,
  persistence: 0.5,
  lacunarity: 2.0,
  continentPower: 1.35,
  mountainScale: 0.5,
  maskFrequency: 0.9,
  maskThreshold: 0.42,
  waterLevel: 0.46,
  landGain: 2.5,
  oceanDepthBias: 0.6,
  beachWidth: 0.05,
  treeLine: 0.55,
  poles: false,
  snowLine: 0.82,
  snowElevation: 0.78,
  treeDensity: 0.28,
  rockDensity: 0.1,
  trees: true,
  rocks: true,
});

/** Creates a Terra object with defaults filled in (minus `radius`, which is not part of the stored config). */
export const make = (props?: { name?: string; config?: Partial<TerraConfig> }): Terra => {
  const { radius: _radius, ...configDefaults } = defaultConfig();
  return Obj.make(Terra, { name: props?.name, config: { ...configDefaults, ...props?.config } });
};

/** Merges stored config over defaults to produce a complete engine config. `radius` is fixed. */
export const toConfigValues = (terra: Terra): TerraConfigValues => {
  const defaults = defaultConfig();
  const config = terra.config ?? {};
  return {
    ...defaults,
    ...Object.fromEntries(Object.entries(config).filter(([, value]) => value !== undefined)),
  };
};
