//
// Copyright 2026 DXOS.org
//

import { EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import * as Atom from 'effect/reactivity/Atom';

import { type SourceKey } from '@dxos/deus/review';

import { type DiffAgainst } from './useSpecSources.ts';

/** What the panel beside a spec shows. */
export const VIEWS = ['definitions', 'review', 'code', 'log', 'decisions', 'data', 'api'] as const;

export type View = (typeof VIEWS)[number];

export const isView = (value: string): value is View => (VIEWS as readonly string[]).includes(value);

/** What a spec's editor and its panel share, wherever each is shown. */
export type SpecSessionState = {
  view: View;
  /** The code file the code view shows. */
  codeTarget?: SourceKey;
  selectedVerdict?: string;
  selectedDecision?: string;
  /** What the editor compares the spec with; undefined outside diff mode. */
  diff?: DiffAgainst;
  /** Whether unchanged runs fold in diff mode. */
  fold: boolean;
};

/** One session per spec, keyed by its id or a static spec's source key; dropped once no editor or panel shows it. */
export const specSession = Atom.family((id: string) =>
  Atom.make<SpecSessionState>({ view: 'definitions', fold: false }),
);

/** The editor each session's spec is open in, so the panel can move it to an item. */
const editors = new Map<string, EditorView>();

export const registerEditor = (id: string, editor: EditorView): (() => void) => {
  editors.set(id, editor);
  return () => {
    if (editors.get(id) === editor) {
      editors.delete(id);
    }
  };
};

export const getEditor = (id: string): EditorView | undefined => editors.get(id);

/** A declaration line (`feat F-1: …`, `  req F-1.2: …`, `type Scene`) for the given id. */
const declarationOf = (id: string) =>
  new RegExp(`^\\s*[a-z]+\\s+${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(?::|$)`);

/** Scrolls the session's editor to the declaration of `item`; false when no editor is open or it does not declare it. */
export const reveal = (id: string, item: string, focus = true): boolean => {
  const editor = editors.get(id);
  if (!editor) {
    return false;
  }
  const pattern = declarationOf(item);
  for (let number = 1; number <= editor.state.doc.lines; number++) {
    const line = editor.state.doc.line(number);
    if (pattern.test(line.text)) {
      editor.dispatch({
        selection: EditorSelection.cursor(line.from),
        effects: EditorView.scrollIntoView(line.from, { y: 'center' }),
      });
      if (focus) {
        editor.focus();
      }
      return true;
    }
  }
  return false;
};
