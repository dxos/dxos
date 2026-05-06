//
// Copyright 2026 DXOS.org
//

import { type Clip } from './types';

/**
 * Each stage in the pipeline transforms a clip before it is delivered to
 * Composer. The MVP pipeline is a single passthrough; future stages (local
 * agent enrichment, user confirmation, etc.) plug in here without touching
 * the picker or the bridge.
 */
export type ClipStage = (clip: Clip) => Promise<Clip> | Clip;

const passthrough: ClipStage = (clip) => clip;

/**
 * Default pipeline. Extendable at runtime via `setClipPipeline`.
 * The internal array is never exposed directly so callers can't mutate it
 * out from under the empty-pipeline fallback in `setClipPipeline`.
 */
let pipeline: ClipStage[] = [passthrough];

/**
 * Get a snapshot of the currently configured clip stages.
 */
export const getClipPipeline = (): ClipStage[] => [...pipeline];

/**
 * Replace the clip pipeline. An empty array falls back to passthrough.
 */
export const setClipPipeline = (stages: readonly ClipStage[]): void => {
  pipeline = stages.length > 0 ? [...stages] : [passthrough];
};

/**
 * Run the configured pipeline over a clip, returning the transformed clip.
 * Stages run sequentially; a stage may be async.
 */
export const runClipPipeline = async (clip: Clip): Promise<Clip> => {
  let current = clip;
  for (const stage of pipeline) {
    current = await stage(current);
  }
  return current;
};
