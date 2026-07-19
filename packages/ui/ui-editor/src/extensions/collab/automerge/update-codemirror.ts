//
// Copyright 2023 DXOS.org
// Copyright 2024 Automerge
// Ref: https://github.com/automerge/automerge-codemirror
//

import {
  type DelPatch,
  type InsertPatch,
  type Patch,
  type Prop,
  type PutPatch,
  type SpliceTextPatch,
} from '@automerge/automerge';
import { ChangeSet, type ChangeSpec, type EditorSelection, type EditorState } from '@codemirror/state';
import { type EditorView } from '@codemirror/view';

import { reconcileAnnotation } from './defs';

export const updateCodeMirror = (view: EditorView, selection: EditorSelection, target: Prop[], patches: Patch[]) => {
  for (const patch of patches) {
    const changeSpec = handlePatch(patch, target, view.state);
    if (changeSpec != null) {
      const changeSet = ChangeSet.of(changeSpec, view.state.doc.length, '\n');
      selection = selection.map(changeSet, 1);
      view.dispatch({
        changes: changeSet,
        annotations: reconcileAnnotation.of(false),
      });
    }
  }

  view.dispatch({
    selection,
    annotations: reconcileAnnotation.of(false),
  });
};

const handlePatch = (patch: Patch, target: Prop[], state: EditorState): ChangeSpec | null => {
  if (patch.action === 'insert') {
    return handleInsert(target, patch);
  } else if (patch.action === 'splice') {
    return handleSplice(target, patch);
  } else if (patch.action === 'del') {
    return handleDel(target, patch);
  } else if (patch.action === 'put') {
    return handlePut(target, patch, state);
  } else {
    return null;
  }
};

const handleInsert = (target: Prop[], patch: InsertPatch): Array<ChangeSpec> => {
  const index = charPath(target, patch.path);
  if (index == null) {
    return [];
  }

  const text = patch.values.map((value) => (value ? value.toString() : '')).join('');
  return [{ from: index, to: index, insert: text }];
};

const handleSplice = (target: Prop[], patch: SpliceTextPatch): Array<ChangeSpec> => {
  const index = charPath(target, patch.path);
  if (index == null) {
    return [];
  }

  return [{ from: index, insert: patch.value }];
};

const handleDel = (target: Prop[], patch: DelPatch): Array<ChangeSpec> => {
  const index = charPath(target, patch.path);
  if (index == null) {
    return [];
  }

  const length = patch.length || 1;
  return [{ from: index, to: index + length }];
};

const handlePut = (target: Prop[], patch: PutPatch, state: EditorState): Array<ChangeSpec> => {
  const index = charPath(target, [...patch.path, 0]);
  if (index == null) {
    return [];
  }

  const length = state.doc.length;
  if (typeof patch.value !== 'string') {
    return []; // TODO(dmaretskyi): How to handle non-string values?
  }

  return [{ from: 0, to: length, insert: patch.value as any }];
};

// If the path of the patch is of the form [path, <index>] then we know this is a path to a character
// within the sequence given by path.
const charPath = (textPath: Prop[], candidatePath: Prop[]): number | null => {
  if (candidatePath.length !== textPath.length + 1) {
    return null;
  }

  for (let i = 0; i < textPath.length; i++) {
    if (textPath[i] !== candidatePath[i]) {
      return null;
    }
  }

  const index = candidatePath[candidatePath.length - 1];
  if (typeof index === 'number') {
    return index;
  }

  return null;
};
