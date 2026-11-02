//
// Copyright 2026 DXOS.org
//

import { type Diagnostic, linter } from '@codemirror/lint';
import { type Extension } from '@codemirror/state';
import { type EditorView } from '@codemirror/view';

import { type SpecIndex } from '../spec-index/spec-index.ts';
import { lintMdl } from './check.ts';

/**
 * Lint extension for Spec .mdl documents; with an index (or a getter for one that loads late) it also
 * checks spec references and dependencies.
 */
export const mdlLint = (index?: SpecIndex | (() => SpecIndex | undefined)): Extension =>
  linter((view: EditorView): Diagnostic[] =>
    lintMdl(view.state.doc.toString(), { index: typeof index === 'function' ? index() : index }),
  );
