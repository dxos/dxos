//
// Copyright 2026 DXOS.org
//

import { DEFAULT_STAGE_MODEL, type StageConfig } from './PipelineConfig';
import { type Stage } from './Stage';

/**
 * Resolve the model for a stage invocation. Precedence: per-stage config override → the stage's own
 * default → the preset/pipeline default → the global {@link DEFAULT_STAGE_MODEL}.
 *
 * All are model NSID names (`StageConfig.model` is a free-form string in the schema to avoid pinning
 * persisted data to the current catalog).
 */
export const resolveModel = (
  stageConfig: StageConfig | undefined,
  stage: Stage<any, any>,
  presetDefault?: string,
): string => stageConfig?.model ?? stage.model ?? presetDefault ?? DEFAULT_STAGE_MODEL;
