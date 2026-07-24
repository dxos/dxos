//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { type Obj } from '@dxos/echo';
import { ViewState } from '@dxos/react-ui-attention/types';
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

  /**
   * Per-object version view state (which version is selected, which branch side is shown, the review
   * mode). In-memory / per-session (never replicated); a missing field falls back to its default
   * (`selection` = current, `view` = branch, `mode` = editing).
   */
  export type VersioningView = {
    selection?: VersionSelection;
    view?: BranchView;
    mode?: ReviewMode;
  };

  const VersionSelectionSchema: Schema.Schema<VersionSelection> = Schema.Union(
    Schema.Struct({ kind: Schema.Literal('current') }),
    Schema.Struct({ kind: Schema.Literal('branch'), branchId: Schema.String }),
    Schema.Struct({ kind: Schema.Literal('fork'), branchId: Schema.String }),
    Schema.Struct({ kind: Schema.Literal('checkpoint'), versionId: Schema.String }),
  );

  /** Version view state keyed by object id, read/written through the ViewState hooks. */
  export const viewAspect: ViewState.Aspect<VersioningView> = ViewState.define<VersioningView>({
    key: 'versioning-view',
    backend: 'memory',
    schema: Schema.Struct({
      selection: Schema.optional(VersionSelectionSchema),
      view: Schema.optional(Schema.Literal('base', 'diff', 'branch')),
      mode: Schema.optional(Schema.Literal('editing', 'suggesting', 'viewing')),
    }).pipe(Schema.mutable),
    defaultValue: () => ({}),
  });

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
