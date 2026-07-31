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
  archiveIfEmpty,
  bindBranch as bind,
  createBranch as create,
  discardBranch as discard,
  findBranch as find,
  isCoreBranch as isCore,
  branchLabel as label,
  mergeBranch as merge,
  suggestionBranch as suggestion,
} from './internal/model';
