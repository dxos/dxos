//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { PublicKey } from '@dxos/keys';

import { BinauralConfigSchema, DEFAULT_CONFIG } from '../generator';

export const SampleName = Schema.Literal('fireplace', 'ocean', 'rain', 'stream');

export type SampleName = Schema.Schema.Type<typeof SampleName>;

export const SAMPLE_NAMES: SampleName[] = ['fireplace', 'ocean', 'rain', 'stream'];

/** Sample audio source. */
export const SampleSourceSchema = Schema.Struct({
  type: Schema.Literal('sample'),
  sample: SampleName.annotations({ description: 'Bundled sample.' }),
});

/** Generator audio source. */
export const GeneratorSourceSchema = Schema.Struct({
  type: Schema.Literal('generator'),
  ...BinauralConfigSchema.fields,
});

/** Discriminated union of audio sources. */
export const SourceSchema = Schema.Union(SampleSourceSchema, GeneratorSourceSchema);

export type Source = Schema.Schema.Type<typeof SourceSchema>;

/** Schema for a single audio layer in the mixer. */
export const Sequence = Schema.Struct({
  id: Schema.String,
  name: Schema.optional(Schema.String.annotations({ description: 'Layer name.' })),
  source: SourceSchema.annotations({ description: 'Audio source.' }),
  /** Layer volume (0-1). */
  volume: Schema.Number.annotations({ description: 'Layer volume (0-1).' }),
  /** Mute this layer. */
  muted: Schema.Boolean.annotations({ description: 'Muted.' }),
});

export type Sequence = Schema.Schema.Type<typeof Sequence>;

/** Get display name for a source. */
export const getSourceLabel = (source: Source): string => {
  return source.type === 'sample' ? source.sample : 'generator';
};

/** Create a sample-based sequence. */
export const makeSampleSequence = (sample: SampleName = 'rain'): Sequence => ({
  id: PublicKey.random().toString(),
  source: { type: 'sample', sample },
  volume: 0.5,
  muted: false,
});

/** Create a generator-based sequence. */
export const makeGeneratorSequence = (): Sequence => ({
  id: PublicKey.random().toString(),
  source: { type: 'generator', ...DEFAULT_CONFIG },
  volume: 0.5,
  muted: false,
});

/** Create a default sequence. */
export const makeSequence = (): Sequence => makeSampleSequence();
