//
// Copyright 2026 DXOS.org
//

import { type EditorViewMode } from '@dxos/ui-editor/types';

import { type ReviewCapabilities } from '../types';

/**
 * Everything the editor-binding decision depends on, flattened to plain data. The hooks gather these
 * from the versioning model and async bindings; the derivation itself is pure so every mode/selection
 * transition can be table-tested without a client or the DOM.
 */
export type LifecycleInputs = {
  /** Per-user review posture for the document (ambient path only). */
  mode: ReviewCapabilities.ReviewMode;
  /** The editor's built-in view mode (source/preview/readonly). */
  viewMode: EditorViewMode | undefined;
  /** What the render policy says this mode may do. */
  policy: ReviewCapabilities.ReviewRenderConfig;
  /** Version selection kind — `current` is the ambient path. */
  selection: ReviewCapabilities.VersionSelection['kind'];
  /** Ids for key derivation (present when the corresponding selection is active). */
  branchId?: string;
  versionId?: string;
  forkId?: string;
  /** Which advanced surface is showing (mutually derived from selection + view). */
  compareActive: boolean;
  baseActive: boolean;
  suggestActive: boolean;
  /** Async resolution status of the documents the binding may need. */
  branchBound: boolean;
  checkpointResolved: boolean;
  forkResolved: boolean;
  ownBranchBound: boolean;
};

/** What the editor mounts: which document backs it, keyed how, rendered how. */
export type BindingDescriptor = {
  subject: 'document' | 'branch' | 'own-branch' | 'snapshot';
  snapshotKey?: string;
  editorKey: string;
  /** `readonly` overrides the caller's view mode; otherwise the caller's mode passes through. */
  effectiveViewMode: EditorViewMode | 'readonly' | undefined;
  /** True while a required async binding is unresolved — the editor must not mount against main. */
  loading: boolean;
  ambient: boolean;
  ambientSuggesting: boolean;
};

/**
 * The editor-binding state machine, as one pure derivation. Order of precedence:
 * snapshot (checkpoint/fork/base) → suggest overlay (bound to main, read-only) → ambient Suggesting
 * (own branch) → selected branch → main. `loading` gates every subject whose document resolves
 * asynchronously, because the editor key does not change when a binding resolves late.
 */
export const deriveBinding = (inputs: LifecycleInputs): BindingDescriptor => {
  const ambient = inputs.selection === 'current';
  const ambientSuggesting = ambient && inputs.mode === 'suggesting';
  const ambientEditable = ambient ? inputs.policy.editable : true;

  const snapshotKey =
    inputs.selection === 'checkpoint'
      ? `checkpoint-${inputs.versionId}`
      : inputs.selection === 'fork'
        ? `fork-${inputs.forkId}`
        : inputs.baseActive
          ? `base-${inputs.branchId}`
          : undefined;

  const loading =
    (inputs.selection === 'branch' && !inputs.branchBound && !inputs.baseActive) ||
    (inputs.selection === 'checkpoint' && !inputs.checkpointResolved) ||
    (inputs.selection === 'fork' && !inputs.forkResolved) ||
    (ambientSuggesting && !inputs.ownBranchBound);

  const subject = snapshotKey
    ? ('snapshot' as const)
    : inputs.suggestActive
      ? ('document' as const)
      : ambientSuggesting && inputs.ownBranchBound
        ? ('own-branch' as const)
        : inputs.selection === 'branch' && inputs.branchBound
          ? ('branch' as const)
          : ('document' as const);

  const editorKey = snapshotKey
    ? snapshotKey
    : inputs.suggestActive
      ? `suggest-${inputs.branchId}`
      : ambientSuggesting
        ? 'suggesting'
        : inputs.selection === 'branch'
          ? `branch-${inputs.branchId}`
          : 'current';

  // Suggesting is an editable posture by definition, but the view-mode dropdown leaves `viewMode`
  // untouched when a contributed mode is picked — so a stale `readonly` (from a Read-only hop) would
  // silently win and the user lands in Suggesting unable to type. The contradiction resolves here.
  const effectiveViewMode =
    snapshotKey || inputs.suggestActive || !ambientEditable
      ? 'readonly'
      : ambientSuggesting && inputs.viewMode === 'readonly'
        ? 'source'
        : inputs.viewMode;

  return {
    subject,
    snapshotKey,
    editorKey,
    effectiveViewMode,
    loading,
    ambient,
    ambientSuggesting,
  };
};
