//
// Copyright 2026 DXOS.org
//

import { type ModelName } from '@dxos/ai';

import { DEFAULT_STAGE_MODEL, type StageConfig } from './PipelineConfig';
import { type Stage } from './Stage';

/**
 * Resolve the model for a stage invocation. Precedence: per-stage config override → the stage's own
 * default → the preset/pipeline default → the global {@link DEFAULT_STAGE_MODEL}.
 *
 * `StageConfig.model` is a free-form string in the schema (to avoid pinning persisted data to the
 * current `ModelName` literal); it is narrowed here to `ModelName` for the `AiService` call.
 */
export const resolveModel = (
  stageConfig: StageConfig | undefined,
  stage: Stage<any, any>,
  presetDefault?: ModelName,
): ModelName => (stageConfig?.model as ModelName | undefined) ?? stage.model ?? presetDefault ?? DEFAULT_STAGE_MODEL;
