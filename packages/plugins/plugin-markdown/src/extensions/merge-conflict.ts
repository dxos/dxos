//
// Copyright 2026 DXOS.org
//

import { type EditorState, type Extension, RangeSetBuilder, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, WidgetType } from '@codemirror/view';

/**
 * A git-style conflict block produced by the 3-way merge:
 * `<<<<<<< branch` / branch lines / `=======` / current lines / `>>>>>>> current`.
 * Offsets are document positions; `from`/`to` span the whole block including markers.
 */
export type ConflictRegion = {
  from: number;
  to: number;
  /** Content between the start marker and the separator. */
  branch: { from: number; to: number };
  /** Content between the separator and the end marker. */
  current: { from: number; to: number };
  startLine: { from: number; to: number };
};

const START_MARKER = '<<<<<<<';
const SEPARATOR = '=======';
const END_MARKER = '>>>>>>>';

/** Scans the document for conflict blocks (line-anchored markers, in order). */
export const findConflicts = (state: EditorState): ConflictRegion[] => {
  const regions: ConflictRegion[] = [];
  const lineCount = state.doc.lines;
  let lineNumber = 1;
  while (lineNumber <= lineCount) {
    const start = state.doc.line(lineNumber);
    if (!start.text.startsWith(START_MARKER)) {
      lineNumber += 1;
      continue;
    }

    let separator: typeof start | undefined;
    let end: typeof start | undefined;
    let restart: number | undefined;
    for (let scan = lineNumber + 1; scan <= lineCount; scan++) {
      const line = state.doc.line(scan);
      if (!separator && line.text.startsWith(START_MARKER)) {
        // A new start marker before the separator: the current block is malformed — abandon it
        // (rather than greedily absorbing the next block's markers) and rescan from here.
        restart = scan;
        break;
      }
      if (!separator && line.text.startsWith(SEPARATOR)) {
        separator = line;
      } else if (separator && line.text.startsWith(END_MARKER)) {
        end = line;
        lineNumber = scan + 1;
        break;
      }
    }
    if (!separator || !end) {
      // Malformed (unterminated) block: skip it so later well-formed conflicts are still found.
      lineNumber = restart ?? lineNumber + 1;
      continue;
    }

    regions.push({
      from: start.from,
      to: end.to,
      branch: { from: Math.min(start.to + 1, separator.from), to: separator.from },
      current: { from: Math.min(separator.to + 1, end.from), to: end.from },
      startLine: { from: start.from, to: start.to },
    });
  }
  return regions;
};

export type ConflictChoice = 'branch' | 'current' | 'both';

/** The change that replaces a conflict block with the chosen side(s). */
export const conflictResolution = (
  state: EditorState,
  region: ConflictRegion,
  choice: ConflictChoice,
): { from: number; to: number; insert: string } => {
  const branchText = state.sliceDoc(region.branch.from, region.branch.to);
  const currentText = state.sliceDoc(region.current.from, region.current.to);
  const insert = choice === 'branch' ? branchText : choice === 'current' ? currentText : `${branchText}${currentText}`;
  // Consume the block's trailing newline so the resolution does not leave a blank line —
  // the inserted sections carry their own.
  const to = state.sliceDoc(region.to, region.to + 1) === '\n' ? region.to + 1 : region.to;
  return { from: region.from, to, insert };
};

/** Replaces the conflict block with the chosen side(s). */
export const resolveConflict = (view: EditorView, region: ConflictRegion, choice: ConflictChoice): void => {
  view.dispatch({ changes: conflictResolution(view.state, region, choice) });
};

/** Inline resolution buttons appended to the conflict's start-marker line. */
class ResolveWidget extends WidgetType {
  #region: ConflictRegion;

  constructor(region: ConflictRegion) {
    super();
    this.#region = region;
  }

  override eq(other: ResolveWidget): boolean {
    return other.#region.from === this.#region.from && other.#region.to === this.#region.to;
  }

  override toDOM(view: EditorView): HTMLElement {
    const container = document.createElement('span');
    container.className = 'cm-conflict-actions';
    for (const [choice, label] of [
      ['branch', 'Accept branch'],
      ['current', 'Accept current'],
      ['both', 'Accept both'],
    ] as const) {
      const button = document.createElement('button');
      button.className = 'cm-conflict-button';
      button.textContent = label;
      button.onmousedown = (event) => {
        event.preventDefault();
        resolveConflict(view, this.#region, choice);
      };
      container.appendChild(button);
    }
    return container;
  }

  override ignoreEvent(): boolean {
    return true;
  }
}

const markerLine = Decoration.line({ class: 'cm-conflict-marker' });
const branchLine = Decoration.line({ class: 'cm-conflict-branch' });
const currentLine = Decoration.line({ class: 'cm-conflict-current' });

const buildDecorations = (state: EditorState): DecorationSet => {
  const builder = new RangeSetBuilder<Decoration>();
  for (const region of findConflicts(state)) {
    let position = region.from;
    while (position <= region.to) {
      const line = state.doc.lineAt(position);
      if (line.text.startsWith(START_MARKER) || line.text.startsWith(SEPARATOR) || line.text.startsWith(END_MARKER)) {
        builder.add(line.from, line.from, markerLine);
      } else if (line.to <= region.branch.to) {
        builder.add(line.from, line.from, branchLine);
      } else {
        builder.add(line.from, line.from, currentLine);
      }
      if (line.from === region.startLine.from) {
        builder.add(line.to, line.to, Decoration.widget({ widget: new ResolveWidget(region), side: 1 }));
      }
      if (line.to >= region.to) {
        break;
      }
      position = line.to + 1;
    }
  }
  return builder.finish();
};

/**
 * Renders 3-way merge conflict blocks left in the document: tinted branch/current sections,
 * styled marker lines, and inline buttons to accept either or both sides.
 */
export const mergeConflicts = (): Extension => {
  const field = StateField.define<DecorationSet>({
    create: (state) => buildDecorations(state),
    update: (value, transaction) => (transaction.docChanged ? buildDecorations(transaction.state) : value),
    provide: (field) => EditorView.decorations.from(field),
  });

  return [field, conflictTheme];
};

const conflictTheme = EditorView.baseTheme({
  '& .cm-conflict-marker': {
    color: 'var(--dx-subdued, var(--color-neutral-text))',
    fontFamily: 'monospace',
    fontSize: '0.85em',
  },
  '& .cm-conflict-branch': {
    backgroundColor: 'var(--color-success-bg)',
  },
  '& .cm-conflict-current': {
    backgroundColor: 'var(--color-info-bg)',
  },
  '& .cm-conflict-actions': {
    display: 'inline-flex',
    gap: '4px',
    marginInlineStart: '8px',
  },
  '& .cm-conflict-button': {
    border: '1px solid var(--dx-separator, currentColor)',
    borderRadius: '4px',
    padding: '0 6px',
    fontSize: '0.75em',
    lineHeight: '1.4',
    cursor: 'pointer',
    background: 'transparent',
  },
});
