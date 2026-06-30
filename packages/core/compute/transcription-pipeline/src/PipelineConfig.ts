//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, Obj, Type } from '@dxos/echo';

/** Cheap, fast default for all stages; same model used by `update-chat-name` / `qualifier`. */
export const DEFAULT_STAGE_MODEL = 'com.anthropic.model.claude-haiku-4-5.default';

/** Per-stage configuration entry within a {@link PipelineConfig}. */
export const StageConfig = Schema.Struct({
  /** Stage id (matches a registered `Stage.id`). */
  id: Schema.String,
  enabled: Schema.Boolean,
  /** Optional per-stage model override (a model DXN); resolved by the runtime. */
  model: Schema.optional(Schema.String),
  /** Optional sliding-window override in blocks. Positive integer; bad values fail validation. */
  window: Schema.optional(Schema.Struct({ blocks: Schema.Number.pipe(Schema.int(), Schema.positive()) })),
});
export type StageConfig = Schema.Schema.Type<typeof StageConfig>;

/**
 * Ordered, persisted configuration that drives a {@link PipelineRuntime}: which stages run, in what
 * order, with which model and window. Presets ("Meeting", "Notes") are seeded instances.
 */
export class PipelineConfig extends Type.makeObject<PipelineConfig>(
  DXN.make('org.dxos.type.transcriptionPipelineConfig', '0.1.0'),
)(
  Schema.Struct({
    name: Schema.String,
    stages: Schema.mutable(Schema.Array(StageConfig)),
  }),
) {}

/** A plain preset descriptor (used to seed a {@link PipelineConfig} object). */
export type PipelinePreset = {
  name: string;
  stages: StageConfig[];
};

/**
 * Built-in presets. `Meeting` runs the three real stages; `Notes` runs correction (+ extraction)
 * and streams into the editor without a cumulative summary.
 */
export const PIPELINE_PRESETS: readonly PipelinePreset[] = Object.freeze([
  {
    name: 'Meeting',
    stages: [
      { id: 'correct', enabled: true },
      { id: 'extract', enabled: true },
      { id: 'summarize', enabled: true },
    ],
  },
  {
    name: 'Notes',
    stages: [
      { id: 'correct', enabled: true },
      { id: 'extract', enabled: false },
      { id: 'summarize', enabled: false },
    ],
  },
]);

export const findPreset = (name: string): PipelinePreset | undefined =>
  PIPELINE_PRESETS.find((preset) => preset.name === name);

/** Instantiate a `PipelineConfig` ECHO object from a preset descriptor. */
export const makeConfigFromPreset = (preset: PipelinePreset): PipelineConfig =>
  Obj.make(PipelineConfig, { name: preset.name, stages: preset.stages.map((stage) => ({ ...stage })) });
