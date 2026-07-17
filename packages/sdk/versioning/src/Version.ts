//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

export { type MakeVersionProps as MakeProps, Version, makeVersion as make } from './internal/types';
export {
  type CreateCheckpointProps as CreateProps,
  clearVersionView as clearView,
  contentAt,
  createCheckpoint as create,
  versionLabel as label,
  restore,
  viewVersion as view,
} from './internal/model';
