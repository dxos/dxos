//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ReviewCapabilities } from '../types';
import {
  type BindingDescriptor,
  type LifecycleInputs,
  applyViewModeSelection,
  deriveBinding,
} from './review-lifecycle';

const EDITING = ReviewCapabilities.defaultReviewRenderPolicy('editing');
const SUGGESTING = ReviewCapabilities.defaultReviewRenderPolicy('suggesting');
const VIEWING = ReviewCapabilities.defaultReviewRenderPolicy('viewing');

/** Ambient editing on main with everything resolved — rows override what they test. */
const BASE: LifecycleInputs = {
  mode: 'editing',
  viewMode: 'preview',
  policy: EDITING,
  selection: 'current',
  compareActive: false,
  baseActive: false,
  suggestActive: false,
  branchBound: false,
  checkpointResolved: false,
  forkResolved: false,
  ownBranchBound: false,
};

describe('deriveBinding', () => {
  // The whole state machine as one table: every reviewable posture and its expected binding.
  const rows: Array<[string, Partial<LifecycleInputs>, Partial<BindingDescriptor>]> = [
    [
      'ambient editing binds main, editable',
      {},
      { subject: 'document', editorKey: 'current', effectiveViewMode: 'preview', loading: false, ambient: true },
    ],
    [
      'ambient viewing stays on main but read-only',
      { mode: 'viewing', policy: VIEWING },
      { subject: 'document', editorKey: 'current', effectiveViewMode: 'readonly', loading: false },
    ],
    [
      // Mounted on main, read-only, until the branch binds — never unmounted (loading) on the
      // ambient path.
      'ambient suggesting waits for the own branch on main, read-only',
      { mode: 'suggesting', policy: SUGGESTING },
      {
        subject: 'document',
        editorKey: 'current',
        loading: false,
        effectiveViewMode: 'readonly',
        ambientSuggesting: true,
      },
    ],
    [
      // The same key as Editing: the swap to the own branch rides the live view's extension
      // reconfiguration, never a remount.
      'ambient suggesting binds the own branch once resolved',
      { mode: 'suggesting', policy: SUGGESTING, ownBranchBound: true },
      { subject: 'own-branch', editorKey: 'current', effectiveViewMode: 'preview', loading: false },
    ],
    [
      'a selected branch waits for its binding',
      { selection: 'branch', branchId: 'b1' },
      { subject: 'document', editorKey: 'branch-b1', loading: true, ambient: false },
    ],
    [
      'a selected branch binds once resolved, editable regardless of mode policy',
      { selection: 'branch', branchId: 'b1', branchBound: true, mode: 'viewing', policy: VIEWING },
      { subject: 'branch', editorKey: 'branch-b1', effectiveViewMode: 'preview', loading: false },
    ],
    [
      'the suggest overlay keeps the editor on main, read-only',
      { selection: 'branch', branchId: 'b1', branchBound: true, compareActive: true, suggestActive: true },
      { subject: 'document', editorKey: 'suggest-b1', effectiveViewMode: 'readonly', loading: false },
    ],
    [
      'the base view is a snapshot and never waits on the branch binding',
      { selection: 'branch', branchId: 'b1', baseActive: true },
      { subject: 'snapshot', editorKey: 'base-b1', effectiveViewMode: 'readonly', loading: false },
    ],
    [
      'a checkpoint waits for its text, then renders a read-only snapshot',
      { selection: 'checkpoint', versionId: 'v1' },
      { subject: 'snapshot', editorKey: 'checkpoint-v1', effectiveViewMode: 'readonly', loading: true },
    ],
    [
      'a resolved checkpoint stops loading',
      { selection: 'checkpoint', versionId: 'v1', checkpointResolved: true },
      { subject: 'snapshot', editorKey: 'checkpoint-v1', effectiveViewMode: 'readonly', loading: false },
    ],
    [
      // F1.7: Read only sets viewMode='readonly'; picking Suggesting afterwards changes only the
      // review mode, so the stale readonly view mode used to win and Suggesting arrived uneditable.
      'suggesting overrides a stale readonly view mode',
      { mode: 'suggesting', policy: SUGGESTING, ownBranchBound: true, viewMode: 'readonly' },
      { subject: 'own-branch', effectiveViewMode: 'source', loading: false },
    ],
    [
      'a fork renders a read-only snapshot once resolved',
      { selection: 'fork', forkId: 'f1', forkResolved: true },
      { subject: 'snapshot', editorKey: 'fork-f1', effectiveViewMode: 'readonly', loading: false },
    ],
  ];

  for (const [label, overrides, expected] of rows) {
    test(label, ({ expect }) => {
      expect(deriveBinding({ ...BASE, ...overrides })).toMatchObject(expected);
    });
  }

  // The F1.7 shape: any sequence of mode/view-mode flips on the ambient path must end editable when
  // it ends in an editable posture — derivation is stateless, so history cannot leak in.
  test('mode round-trips are history-free', ({ expect }) => {
    const sequence: Array<Partial<LifecycleInputs>> = [
      { mode: 'suggesting', policy: SUGGESTING, ownBranchBound: true },
      { mode: 'editing', policy: EDITING, viewMode: 'preview' },
      { mode: 'editing', policy: EDITING, viewMode: 'source' },
      { mode: 'suggesting', policy: SUGGESTING, ownBranchBound: true, viewMode: 'source' },
    ];
    let last: BindingDescriptor | undefined;
    for (const step of sequence) {
      last = deriveBinding({ ...BASE, ...step });
    }
    expect(last?.effectiveViewMode).toBe('source');
    expect(last?.subject).toBe('own-branch');
    expect(last?.loading).toBe(false);
  });
});

describe('applyViewModeSelection', () => {
  // One dropdown gesture writes BOTH halves of the pair — the table is the contract.
  const rows: Array<
    [
      string,
      Parameters<typeof applyViewModeSelection>[0],
      Parameters<typeof applyViewModeSelection>[1],
      ReturnType<typeof applyViewModeSelection>,
    ]
  > = [
    [
      'Markdown (preview) is an editing posture',
      { mode: 'suggesting', viewMode: 'source' },
      { kind: 'builtin', viewMode: 'preview' },
      { mode: 'editing', viewMode: 'preview' },
    ],
    [
      'Plain text (source) is an editing posture',
      { mode: 'viewing', viewMode: 'readonly' },
      { kind: 'builtin', viewMode: 'source' },
      { mode: 'editing', viewMode: 'source' },
    ],
    [
      'Read only is the viewing posture',
      { mode: 'editing', viewMode: 'preview' },
      { kind: 'builtin', viewMode: 'readonly' },
      { mode: 'viewing', viewMode: 'readonly' },
    ],
    [
      'Suggesting keeps the current editable view mode',
      { mode: 'editing', viewMode: 'preview' },
      { kind: 'contributed', reviewMode: 'suggesting' },
      { mode: 'suggesting', viewMode: 'preview' },
    ],
    [
      'Suggesting from Read only steps the editor off readonly (F1.7)',
      { mode: 'viewing', viewMode: 'readonly' },
      { kind: 'contributed', reviewMode: 'suggesting' },
      { mode: 'suggesting', viewMode: 'source' },
    ],
  ];

  for (const [label, prev, selection, expected] of rows) {
    test(label, ({ expect }) => {
      expect(applyViewModeSelection(prev, selection)).toEqual(expected);
    });
  }
});
