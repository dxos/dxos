//
// Copyright 2026 DXOS.org
//

import { Annotation, type Extension, StateEffect, StateField, Transaction } from '@codemirror/state';
import { type EditorView } from '@codemirror/view';

const place = StateEffect.define<{ id: number; pos: number }>();
const drop = StateEffect.define<number>();

const writing = Annotation.define<number>();

/** Text inserted at an anchor goes after it, except a link: later attachments at its position move past it. */
const assoc = (id: number, written: number | undefined): 1 | -1 => (written !== undefined && id > written ? 1 : -1);

const anchors = StateField.define<ReadonlyMap<number, number>>({
  create: () => new Map(),
  update: (value, tr) => {
    if (!tr.docChanged && !tr.effects.some((effect) => effect.is(place) || effect.is(drop))) {
      return value;
    }
    const written = tr.annotation(writing);
    const next = new Map<number, number>();
    for (const [id, pos] of value) {
      next.set(id, tr.changes.mapPos(pos, assoc(id, written)));
    }
    for (const effect of tr.effects) {
      if (effect.is(place)) {
        next.set(effect.value.id, effect.value.pos);
      } else if (effect.is(drop)) {
        next.delete(effect.value);
      }
    }
    return next;
  },
});

export const attachmentAnchors = (): Extension => anchors;

export const placeAnchor = (view: EditorView, id: number, pos = view.state.selection.main.head): void =>
  view.dispatch({ effects: place.of({ id, pos }) });

export const dropAnchor = (view: EditorView, id: number): void => view.dispatch({ effects: drop.of(id) });

export const insertAtAnchor = (view: EditorView, id: number, text: string): boolean => {
  const pos = view.state.field(anchors).get(id);
  if (pos === undefined) {
    return false;
  }
  const before = pos > 0 && !/\s/.test(view.state.sliceDoc(pos - 1, pos)) ? ' ' : '';
  const after = /^\s/.test(view.state.sliceDoc(pos, pos + 1)) ? text.trimEnd() : text;
  const insert = before + after;
  const { main } = view.state.selection;
  view.dispatch({
    changes: { from: pos, insert },
    ...(main.empty && main.head === pos ? { selection: { anchor: pos + insert.length } } : {}),
    effects: drop.of(id),
    annotations: [writing.of(id), Transaction.addToHistory.of(false)],
  });
  return true;
};
