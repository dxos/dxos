//
// Copyright 2026 DXOS.org
//

import { type EditorState, type Extension, RangeSetBuilder, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, GutterMarker, WidgetType, gutter } from '@codemirror/view';

import { type DiffSpan, diffSpans } from '../model';

export type VersionDiffOptions = {
  /** Content the current doc is compared against (branch anchor or checkpoint). */
  base: string;
  variant: 'inline' | 'gutter';
};

/**
 * Renders the difference between `base` and the live document, either as inline
 * suggestion-style decorations or as gutter change bars. Recomputed on every edit so the
 * overlay stays correct while a branch is being edited in compare mode.
 */
export const versionDiff = ({ base, variant }: VersionDiffOptions): Extension => {
  return variant === 'inline' ? inlineDiff(base) : gutterDiff(base);
};

//
// Inline (unified suggestion style).
//

/** Widget rendering deleted base text in place (zero-width in the current doc). */
class DeletionWidget extends WidgetType {
  constructor(private readonly _text: string) {
    super();
  }

  override eq(other: DeletionWidget): boolean {
    return other._text === this._text;
  }

  override toDOM(): HTMLElement {
    const span = document.createElement('span');
    span.className = 'cm-version-delete';
    span.textContent = this._text;
    return span;
  }
}

const insertMark = Decoration.mark({ class: 'cm-version-insert' });

const buildInlineDecorations = (base: string, state: EditorState): DecorationSet => {
  const builder = new RangeSetBuilder<Decoration>();
  for (const span of computeSpans(base, state)) {
    if (span.kind === 'insert') {
      builder.add(span.from, span.to, insertMark);
    } else if (span.kind === 'delete') {
      builder.add(span.from, span.from, Decoration.widget({ widget: new DeletionWidget(span.text), side: -1 }));
    }
  }
  return builder.finish();
};

const inlineDiff = (base: string): Extension => {
  const field = StateField.define<DecorationSet>({
    create: (state) => buildInlineDecorations(base, state),
    update: (value, transaction) => (transaction.docChanged ? buildInlineDecorations(base, transaction.state) : value),
    provide: (field) => EditorView.decorations.from(field),
  });

  return [field, diffTheme];
};

//
// Gutter change bars.
//

type LineChange = 'insert' | 'delete' | 'both';

class ChangeMarker extends GutterMarker {
  constructor(private readonly _change: LineChange) {
    super();
  }

  override eq(other: ChangeMarker): boolean {
    return other._change === this._change;
  }

  override toDOM(): Node {
    const bar = document.createElement('div');
    bar.className = `cm-version-gutter-marker cm-version-gutter-${this._change}`;
    return bar;
  }
}

/** Map diff spans onto the set of changed lines in the current doc. */
const changedLines = (base: string, state: EditorState): Map<number, LineChange> => {
  const lines = new Map<number, LineChange>();
  const mark = (position: number, change: LineChange) => {
    const line = state.doc.lineAt(Math.min(position, state.doc.length)).number;
    const current = lines.get(line);
    lines.set(line, current && current !== change ? 'both' : (current ?? change));
  };

  for (const span of computeSpans(base, state)) {
    if (span.kind === 'insert') {
      for (let position = span.from; position <= span.to; ) {
        const line = state.doc.lineAt(Math.min(position, state.doc.length));
        mark(position, 'insert');
        position = line.to + 1;
      }
    } else if (span.kind === 'delete') {
      mark(span.from, 'delete');
    }
  }
  return lines;
};

const gutterDiff = (base: string): Extension => {
  const field = StateField.define<Map<number, LineChange>>({
    create: (state) => changedLines(base, state),
    update: (value, transaction) => (transaction.docChanged ? changedLines(base, transaction.state) : value),
  });

  return [
    field,
    gutter({
      class: 'cm-version-gutter',
      lineMarker: (view, line) => {
        const change = view.state.field(field).get(view.state.doc.lineAt(line.from).number);
        return change ? new ChangeMarker(change) : null;
      },
      lineMarkerChange: (update) => update.docChanged,
    }),
    diffTheme,
  ];
};

//
// Shared.
//

const computeSpans = (base: string, state: EditorState): DiffSpan[] => diffSpans(base, state.doc.toString());

const diffTheme = EditorView.baseTheme({
  '& .cm-version-insert': {
    backgroundColor: 'var(--color-success-bg)',
    borderRadius: '2px',
  },
  '& .cm-version-delete': {
    backgroundColor: 'var(--color-error-bg)',
    textDecoration: 'line-through',
    opacity: 0.7,
    borderRadius: '2px',
  },
  '& .cm-version-gutter': {
    width: '4px',
  },
  '& .cm-version-gutter-marker': {
    width: '4px',
    height: '100%',
    borderRadius: '2px',
  },
  '& .cm-version-gutter-insert': {
    backgroundColor: 'var(--color-success-text)',
  },
  '& .cm-version-gutter-delete': {
    backgroundColor: 'var(--color-error-text)',
  },
  '& .cm-version-gutter-both': {
    backgroundColor: 'var(--color-warning-text)',
  },
});
