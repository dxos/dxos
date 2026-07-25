//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ReviewCapabilities } from '../types';
import { type BindingDescriptor, type LifecycleInputs, deriveBinding } from './review-lifecycle';

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
      'ambient suggesting waits for the own branch',
      { mode: 'suggesting', policy: SUGGESTING },
      { subject: 'document', editorKey: 'suggesting', loading: true, ambientSuggesting: true },
    ],
    [
      'ambient suggesting binds the own branch once resolved',
      { mode: 'suggesting', policy: SUGGESTING, ownBranchBound: true },
      { subject: 'own-branch', editorKey: 'suggesting', effectiveViewMode: 'preview', loading: false },
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
