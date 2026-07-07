//
// Copyright 2026 DXOS.org
//

import { DXN } from '@dxos/echo';

import { DEFAULT_STAGE_MODEL, type Stage, type StageConfig } from './types';

/**
 * Resolve the model for a stage invocation. Precedence: per-stage config override → the stage's own
 * default → the preset/pipeline default → the global {@link DEFAULT_STAGE_MODEL}.
 *
 * `StageConfig.model` is a validated NSID name in the schema (its format is checked, but it is not
 * pinned to the current model catalog); it is parsed to a model DXN here for the `AiService` call.
 */
export const resolveModel = (
  stageConfig: StageConfig | undefined,
  stage: Stage<any, any>,
  presetDefault?: DXN.DXN,
): DXN.DXN =>
  (stageConfig?.model ? DXN.tryMake(stageConfig.model) : undefined) ??
  stage.model ??
  presetDefault ??
  DEFAULT_STAGE_MODEL;
