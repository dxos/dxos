//
// Copyright 2026 DXOS.org
//

/** How far a page of the learning path has built the app, in the order the path builds it. */
export type Stage =
  | 'name'
  | 'spaces'
  | 'invite'
  | 'contacts'
  | 'devices'
  | 'recovery';

export const STAGES: readonly Stage[] = [
  'name',
  'spaces',
  'invite',
  'contacts',
  'devices',
  'recovery',
];

export const isStage = (value: unknown): value is Stage =>
  STAGES.some((stage) => stage === value);

/** Whether `stage` includes what `at` adds. */
export const reached = (stage: Stage, at: Stage) =>
  STAGES.indexOf(stage) >= STAGES.indexOf(at);
