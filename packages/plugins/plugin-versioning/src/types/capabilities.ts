//
// Copyright 2026 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';
import { type Obj } from '@dxos/echo';
import { type Text } from '@dxos/schema';

import { meta } from '#meta';

export namespace VersioningCapabilities {
  /** Which version of an object the local user is viewing. Never replicated. */
  export type VersionSelection =
    | { kind: 'current' }
    | { kind: 'branch'; branchId: string }
    // The branch's fork point: a read-only view of the parent content at the branch anchor (the
    // state the branch was created from). Distinct from `branch` (the editable branch tip).
    | { kind: 'fork'; branchId: string }
    | { kind: 'checkpoint'; versionId: string };

  /**
   * Which side of a selected branch the editor shows: the parent content at the anchor (`base`,
   * read-only), the diff/suggestion overlay (`diff`), or the editable branch draft (`branch`).
   */
  export type BranchView = 'base' | 'diff' | 'branch';

  /** Per-user editing posture for a document (Google-Docs-style). Local UI preference, never replicated. */
  export type ReviewMode = 'editing' | 'suggesting' | 'viewing';

  export type VersioningState = {
    /** Selection keyed by object id. Missing entry = current. */
    selection: Record<string, VersionSelection>;
    /** Active branch view keyed by object id. Missing entry = `branch` (the editable draft). */
    view: Record<string, BranchView>;
    /** Review mode keyed by object id. Missing entry = `editing`. */
    mode: Record<string, ReviewMode>;
  };

  /** In-memory (per-session) version selection state. */
  export const VersioningState = Capability.make<Atom.Writable<VersioningState>>(
    `${meta.profile.key}.capability.versioning-state`,
  );

  /** What the editor should render for a given review mode. */
  export type ReviewRenderConfig = { showSuggestions: boolean; showComments: boolean; editable: boolean };

  /** Maps a per-document review mode to the editor's render config. */
  export type ReviewRenderPolicyFn = (mode: ReviewMode) => ReviewRenderConfig;

  /**
   * GDocs parity: Editing/Suggesting overlay suggestions + comments and are editable; Viewing is a
   * clean, read-only read (comments still shown). Override by contributing a stronger capability
   * earlier in plugin order.
   */
  export const defaultReviewRenderPolicy: ReviewRenderPolicyFn = (mode) =>
    mode === 'viewing'
      ? { showSuggestions: false, showComments: true, editable: false }
      : { showSuggestions: true, showComments: true, editable: true };

  export const ReviewRenderPolicy = Capability.make<ReviewRenderPolicyFn>(
    `${meta.profile.key}.capability.review-render-policy`,
  );

  /**
   * Per-type opt-in to the generic history companion (checkpoints/branches timeline).
   * `id` is the typename gating the companion; `getTarget` resolves the versioned Text root.
   */
  export type HistoryProvider = Readonly<{
    id: string;
    getTarget: (object: Obj.Unknown) => Text.Text | undefined;
  }>;
  export const HistoryProvider = Capability.make<HistoryProvider>(`${meta.profile.key}.capability.history-provider`);
}
