//
// Copyright 2026 DXOS.org
//

import { type FC } from 'react';

import { type Stage } from '@dxos/pipeline';
import { type Message } from '@dxos/types';

/** Ordered stage ids of the full email pipeline. */
export type StageId = 'summarize' | 'extract-contacts' | 'stats' | 'extract-facts' | 'threads' | 'topics';

/** AiService backend a run uses. `fixture` swaps in recorded outputs (offline, deterministic). */
export type Backend = 'edge' | 'ollama' | 'fixture';

/** Per-stage configuration (variant-driven; read-only in the panel). */
export type StageConfig = {
  readonly id: StageId;
  readonly enabled: boolean;
  /** Model DXN passed to AiService-backed stages; ignored by pure stages. */
  readonly model?: string;
};

/** Whole-run configuration set by a story variant. */
export type PipelineConfig = {
  readonly backend: Backend;
  readonly stages: readonly StageConfig[];
};

/** Props every stage OutputView receives: the accumulated result for that stage (or undefined pre-run). */
export type StageOutputProps = {
  readonly result: unknown;
};

/** Registry entry: a stage's metadata, its Stage factory, and its output view. */
export type StageDef = {
  readonly id: StageId;
  readonly label: string;
  readonly description: string;
  /** True for AiService-backed stages (panel shows backend/model; pure stages don't). */
  readonly usesAi: boolean;
  readonly OutputView: FC<StageOutputProps>;
};

/** A message plus per-stage accumulated results, keyed by stage id. */
export type RunState = {
  readonly messages: readonly Message.Message[];
  readonly results: Partial<Record<StageId, unknown>>;
  readonly active?: StageId;
};

export type { Stage };
