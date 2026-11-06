//
// Copyright 2026 DXOS.org
//

import { Annotation, type EditorState, type Extension, Transaction } from '@codemirror/state';
import { EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

import { type Change, minimalChange, offsetMap } from '@dxos/deus/schema';
import { Cursor, type CursorConverter, awareness } from '@dxos/ui-editor';

import { blockListeners, specBlocksConfig } from './spec-blocks-state.ts';

/** A part of the spec text a field editor edits: its value, the source range it is read from, and how to write it. */
export type PartSource = {
  value: string;
  from: number;
  to: number;
  patch: (next: string) => readonly Change[];
};

export type PartBindingOptions = {
  /** The spec editor. */
  parent: EditorView;
  /** The part in the spec editor's current state; undefined once the part is gone. */
  locate: (state: EditorState) => PartSource | undefined;
  /** Whitespace is the value's own, as in code, rather than prose's line wrapping. */
  verbatim?: boolean;
};

/** Prose as its words in paragraphs, as the spec's text states it whatever its wrapping. */
const normalize = (text: string) =>
  text
    .split(/\n[ \t]*\n/)
    .map((paragraph) => paragraph.split(/\s+/).filter(Boolean).join(' '))
    .filter(Boolean)
    .join('\n\n');

const syncAnnotation = Annotation.define<boolean>();

/**
 * Binds a field editor to one part of the spec editor's text: the field's edits are written back as the changes to that
 * part's source alone, the spec's changes from elsewhere replace the field's text when they change what it states, and
 * the other peers' carets and the comments on the part show in the field.
 */
export const partBinding = ({ parent, locate, verbatim }: PartBindingOptions): Extension => {
  const same = (a: string, b: string) => (verbatim ? a.trimEnd() === b.trimEnd() : normalize(a) === normalize(b));
  const field: { view?: EditorView } = {};

  // The field's text against the part's source, so a caret maps to the character it is at in the spec.
  const offsets = () => {
    const source = locate(parent.state);
    return (
      source &&
      offsetMap(
        field.view?.state.doc.toString() ?? source.value,
        parent.state.sliceDoc(source.from, source.to),
        source.from,
      )
    );
  };
  const converter = () => parent.state.facet(Cursor.converter);
  const contains = (cursor: string) => {
    const source = locate(parent.state);
    const position = converter().fromCursor(cursor);
    return !!source && position >= source.from && position <= source.to;
  };
  const provider = parent.state
    .facet(specBlocksConfig)
    .awareness?.field({ hasFocus: () => field.view?.hasFocus ?? false, contains });

  let writing = false;
  const sync = (view: EditorView) => {
    const source = locate(parent.state);
    const current = view.state.doc.toString();
    if (!source || same(current, source.value)) {
      return;
    }
    const change = minimalChange(0, current, source.value);
    view.dispatch({
      ...(change && { changes: change }),
      annotations: [syncAnnotation.of(true), Transaction.remote.of(true), Transaction.addToHistory.of(false)],
    });
  };

  const fieldConverter: CursorConverter = {
    toCursor: (position, assoc) => {
      const map = offsets();
      return map ? converter().toCursor(map.toSource(position), assoc) : '';
    },
    // Not a position for an anchor outside the part, so a comment there is not drawn in the field.
    fromCursor: (cursor) => offsets()?.fromSource(converter().fromCursor(cursor)) ?? Number.NaN,
  };

  return [
    Cursor.converter.of(fieldConverter),
    ViewPlugin.fromClass(
      class {
        readonly #listener = (update: ViewUpdate) => {
          if (update.docChanged && !writing) {
            sync(this.view);
          }
        };

        constructor(readonly view: EditorView) {
          field.view = view;
          parent.plugin(blockListeners)?.listeners.add(this.#listener);
          // Deferred out of the update cycle that created the view, as a binding's first read must be.
          queueMicrotask(() => sync(view));
        }

        destroy() {
          parent.plugin(blockListeners)?.listeners.delete(this.#listener);
          field.view = undefined;
        }
      },
    ),
    EditorView.updateListener.of(({ docChanged, state, transactions }) => {
      if (!docChanged || transactions.every((transaction) => transaction.annotation(syncAnnotation))) {
        return;
      }
      const changes = locate(parent.state)?.patch(state.doc.toString()) ?? [];
      if (changes.length > 0) {
        writing = true;
        try {
          parent.dispatch({ changes: [...changes], userEvent: 'input' });
        } finally {
          writing = false;
        }
      }
    }),
    provider ? awareness(provider) : [],
    parent.state.facet(specBlocksConfig).fieldExtensions ?? [],
  ];
};
