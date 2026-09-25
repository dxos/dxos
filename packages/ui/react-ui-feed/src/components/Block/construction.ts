//
// Copyright 2026 DXOS.org
//

import { EditorState, type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

/**
 * What one item costs to build.
 *
 * The list's first fill mounts a viewport's worth of rows at once, so the wall-clock cost of that
 * fill is the per-item construction cost times the number of rows on screen — which is why this is
 * measured per extension set rather than per story: the answer has to say *what* to drop.
 *
 * Only meaningful in a real browser. Construction is dominated by style resolution and the forced
 * layout that follows it, neither of which a DOM shim performs.
 */
export type ConstructionCase = {
  name: string;
  extensions: Extension[];
};

export type ConstructionResult = {
  name: string;
  /** Mean milliseconds to construct one view and force its layout. */
  mean: number;
  /** Slowest single construction in the run, which is what a dropped frame is made of. */
  worst: number;
};

export type ConstructionProfileOptions = {
  parent: HTMLElement;
  cases: ConstructionCase[];
  doc: string;
  runs?: number;
};

/**
 * Times construction of `runs` views per case, including the layout each one forces.
 *
 * Views are destroyed after each case rather than at the end: a hundred live editors in one parent
 * make every subsequent layout progressively more expensive, which would report the harness.
 */
export const profileConstruction = ({
  parent,
  cases,
  doc,
  runs = 20,
}: ConstructionProfileOptions): ConstructionResult[] =>
  cases.map(({ name, extensions }) => {
    // Discarded: the first view of a run pays for style sheets the rest reuse.
    construct(parent, extensions, doc).destroy();

    const views: EditorView[] = [];
    let worst = 0;
    const start = performance.now();
    for (let index = 0; index < runs; index++) {
      const before = performance.now();
      views.push(construct(parent, extensions, doc));
      worst = Math.max(worst, performance.now() - before);
    }
    const mean = (performance.now() - start) / runs;

    for (const view of views) {
      view.destroy();
    }

    return { name, mean, worst };
  });

// Reading `offsetHeight` is not incidental: the row is measured the instant it mounts, so the
// layout the editor forces is part of what the item costs.
const construct = (parent: HTMLElement, extensions: Extension[], doc: string): EditorView => {
  const view = new EditorView({ parent, state: EditorState.create({ doc, extensions }) });
  void view.dom.offsetHeight;
  return view;
};
