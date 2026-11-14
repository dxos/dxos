//
// Copyright 2026 DXOS.org
//

import { type Diagnostic, linter } from '@codemirror/lint';
import { type Extension, Facet } from '@codemirror/state';
import { type EditorView } from '@codemirror/view';

import { type SpecIndex } from '../spec-index/spec-index.ts';
import { lintMdl } from './check.ts';

/** What the editor knows of the spec from elsewhere than its text. */
export type MdlSpec = {
  /** The spec's id; unset, the lint reads its frontmatter `id`. */
  id?: string;
  /** The block types of the dialects the spec is read with; unset, only the core ones. */
  types?: readonly string[];
};

const NO_SPEC: MdlSpec = {};

/** The spec the editor holds, from elsewhere than its text; reconfiguring it lints again. */
export const mdlSpec = Facet.define<MdlSpec, MdlSpec>({ combine: (values) => values.at(-1) ?? NO_SPEC });

/**
 * Lint extension for Spec .mdl documents; with an index (or a getter for one that loads late) it also
 * checks spec references and dependencies.
 */
export const mdlLint = (index?: SpecIndex | (() => SpecIndex | undefined)): Extension =>
  linter(
    (view: EditorView): Diagnostic[] =>
      lintMdl(view.state.doc.toString(), {
        index: typeof index === 'function' ? index() : index,
        selfId: view.state.facet(mdlSpec).id,
        types: view.state.facet(mdlSpec).types,
      }),
    { needsRefresh: (update) => update.state.facet(mdlSpec) !== update.startState.facet(mdlSpec) },
  );
