//
// Copyright 2026 DXOS.org
//

import { type Diagnostic, linter } from '@codemirror/lint';
import { type EditorView } from '@codemirror/view';

import { lintMdl } from './check.ts';

/**
 * Lint extension for Spec .mdl documents.
 */
export const mdlLint = linter((view: EditorView): Diagnostic[] => lintMdl(view.state.doc.toString()));
