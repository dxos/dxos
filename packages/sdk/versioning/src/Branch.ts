//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

export {
  Branch,
  type MakeBranchProps as MakeProps,
  BranchStatus as Status,
  makeBranch as make,
} from './internal/types';
export {
  type CreateBranchProps as CreateProps,
  type MergeResult,
  createBranch as create,
  discardBranch as discard,
  findBranch as find,
  branchLabel as label,
  mergeBranch as merge,
} from './internal/model';
