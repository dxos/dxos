//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Layer from 'effect/Layer';

import { Progress as ProgressCore } from '@dxos/progress';

// The registry primitives now live in @dxos/progress so the pipeline (this Effect service) and the
// app-toolkit ProgressRegistry capability share one implementation.
export type TaskStatus = ProgressCore.TaskStatus;
export type TaskProgress = ProgressCore.TaskProgress;
export type ProgressSnapshot = ProgressCore.ProgressSnapshot;
export type TaskHandle = ProgressCore.TaskHandle;
export type ProgressApi = ProgressCore.ProgressApi;
export const make = ProgressCore.make;
export const deriveEta = ProgressCore.deriveEta;

export class Progress extends Context.Tag('@dxos/pipeline/Progress')<Progress, ProgressCore.ProgressApi>() {
  /** A fresh in-memory registry. */
  static layer: Layer.Layer<Progress> = Layer.sync(Progress, () => ProgressCore.make());
}
