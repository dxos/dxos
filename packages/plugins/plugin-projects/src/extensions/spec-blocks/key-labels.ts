//
// Copyright 2026 DXOS.org
//

import {
  EditorState,
  type Extension,
  Prec,
  type Range,
  RangeSet,
  type Transaction,
  type TransactionSpec,
} from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, WidgetType, keymap } from '@codemirror/view';

import { type SpecItem, isReferenceField, labelsByKey, mintKey } from '@dxos/deus/schema';

import { specBlocksConfig, specBlocksField } from './spec-blocks-state.ts';

/** Where the text writes a numbered item's key, and the positional label drawn in its place. */
export type KeyLabel = { from: number; to: number; key: string; label: string };

type Span = { from: number; to: number };

/** Text the user cannot edit in part: a numbered item's key with the syntax around it. */
export type Guard = Span & {
  /** The key within the guard. */
  key: Span;
  /** What an edit may remove whole: a keyed line through its text, a block's header line, or a reference. */
  extent: Span;
  /** The item the key declares; a reference declares none. */
  item?: SpecItem;
};

const TOKEN = /[A-Za-z0-9][\w-]*/g;
const TOKEN_END = /[\w-]$/;
const TOKEN_START = /^[\w-]/;
/** Where a value's note starts: a `#` at the line's start or after a space. */
const NOTE = /(^|[ \t])#/;

/** The keys a block's reference fields name, outside any note, labelled by the items they name. */
const references = (state: EditorState): KeyLabel[] => {
  const { items, schemas, blocks } = state.field(specBlocksField);
  const labels = labelsByKey(items);
  const result: KeyLabel[] = [];
  for (const block of blocks) {
    const names = new Set(
      schemas
        .get(block.kind)
        ?.fields.filter(isReferenceField)
        .map(({ name }) => name),
    );
    for (const field of block.fields) {
      if (!names.has(field.name)) {
        continue;
      }
      for (const line of [field.inline, ...field.lines]) {
        const note = line.text.search(NOTE);
        for (const match of line.text.slice(0, note < 0 ? undefined : note).matchAll(TOKEN)) {
          const label = labels.get(match[0]);
          if (label) {
            const from = line.from + match.index;
            result.push({ from, to: from + match[0].length, key: match[0], label });
          }
        }
      }
    }
  }
  return result;
};

/**
 * Every place the text writes the key of a numbered item: a block's id, a keyed line's key, and a reference field's
 * value that names one. In document order.
 */
export const keyLabels = (state: EditorState): KeyLabel[] => {
  const result: KeyLabel[] = [];
  for (const { key, label, block, entry } of state.field(specBlocksField).items) {
    const range = entry ? entry.keyRange : block.header.id;
    if (label && range) {
      result.push({ ...range, key, label });
    }
  }
  return [...result, ...references(state)].sort((a, b) => a.from - b.from);
};

/** The end of the colon after a key, past any spaces or tabs before it; the key's end if there is none. */
const colonEnd = (text: string, keyEnd: number) => {
  let at = keyEnd;
  while (text[at] === ' ' || text[at] === '\t') {
    at++;
  }
  return text[at] === ':' ? at + 1 : keyEnd;
};

/** Guards by the blocks they were read from, which change with every edit of the text. */
const guardCache = new WeakMap<object, Guard[]>();

/**
 * The text around each key that an edit must change whole or not at all: a keyed line from its line's start through
 * `req <key>: `, a block's id with the space before it and its colon, and a key a reference field names.
 */
export const guards = (state: EditorState): Guard[] => {
  const blocks = state.field(specBlocksField);
  const cached = guardCache.get(blocks);
  if (cached) {
    return cached;
  }
  const text = state.doc.toString();
  const declared = blocks.items.flatMap((item): Guard[] => {
    if (!item.label) {
      return [];
    }
    if (item.entry?.keyRange) {
      const from = state.doc.lineAt(item.entry.from).from;
      const colon = colonEnd(text, item.entry.keyRange.to);
      const to = text[colon] === ' ' ? colon + 1 : colon;
      return [{ from, to, key: item.entry.keyRange, extent: { from, to: Math.max(item.entry.to, to) }, item }];
    }
    const id = item.block.header.id;
    if (!id) {
      return [];
    }
    const from = text[id.from - 1] === ' ' ? id.from - 1 : id.from;
    const line = state.doc.lineAt(item.block.header.from);
    return [{ from, to: colonEnd(text, id.to), key: id, extent: { from: line.from, to: line.to }, item }];
  });
  const named = references(state).map(({ from, to }): Guard => ({ from, to, key: { from, to }, extent: { from, to } }));
  const result = [...declared, ...named].sort((a, b) => a.from - b.from);
  guardCache.set(blocks, result);
  return result;
};

/**
 * Whether a change breaks a guard without removing all of what it keeps: it edits inside the guard, writes on a keyed
 * line's start or joins that line to the one above, or extends a referenced key at either end.
 */
const breaks = (state: EditorState, guard: Guard, from: number, to: number, inserted: string) => {
  const inside = from === to ? from > guard.from && from < guard.to : from < guard.to && to > guard.from;
  // Ends at a keyed line's start without leaving a line break there: text before the line, or a join with the one above.
  const keepsBreak =
    inserted.endsWith('\n') || (inserted === '' && (from === 0 || state.doc.sliceString(from - 1, from) === '\n'));
  const atLineStart =
    guard.item?.entry !== undefined && to === guard.from && (from < to || inserted !== '') && !keepsBreak;
  const extended =
    guard.item === undefined &&
    ((to === guard.from && TOKEN_END.test(inserted)) || (from === guard.to && TOKEN_START.test(inserted)));
  if (!inside && !atLineStart && !extended) {
    return false;
  }
  return !(from <= guard.extent.from && to >= guard.extent.to);
};

/** Drops a typed or deleted edit that would change part of a key, so a key only goes with its item. */
const keepKeys = EditorState.transactionFilter.of((transaction: Transaction) => {
  const { startState } = transaction;
  if (
    !transaction.docChanged ||
    startState.facet(specBlocksConfig).cards ||
    !(transaction.isUserEvent('input') || transaction.isUserEvent('delete'))
  ) {
    return transaction;
  }
  const kept = guards(startState);
  let broken = false;
  transaction.changes.iterChanges((from, to, _fromB, _toB, inserted) => {
    broken ||= kept.some((guard) => breaks(startState, guard, from, to, inserted.toString()));
  });
  return broken ? [] : transaction;
});

/** The keyed line of a numbered item whose text, or the spaces after it, holds the caret, and where that text starts. */
const keyedLineAt = (state: EditorState) => {
  const head = state.selection.main;
  if (!head.empty) {
    return undefined;
  }
  const guard = guards(state).find(
    ({ item, to }) => item?.entry && head.head >= to && head.head <= state.doc.lineAt(Math.max(item.entry.to, to)).to,
  );
  return guard && { guard, entry: guard.item!.entry!, textFrom: guard.to };
};

/**
 * Enter in a requirement's text starts the next requirement, with a fresh key, after the caret; on an empty one it
 * ends the list, leaving a blank line at the block's indent.
 */
export const continueKeyedLine = (state: EditorState): TransactionSpec | undefined => {
  const at = keyedLineAt(state);
  if (!at) {
    return undefined;
  }
  const { guard, entry } = at;
  const indent = state.doc.sliceString(guard.from, entry.from);
  const head = state.selection.main.head;
  if (entry.inline.text === '' && entry.lines.length === 0) {
    return {
      changes: { from: guard.from, to: head, insert: indent },
      selection: { anchor: guard.from + indent.length },
      userEvent: 'input',
    };
  }
  const taken = new Set(state.field(specBlocksField).items.map(({ key }) => key));
  const insert = `\n${indent}${entry.name} ${mintKey(taken)}: `;
  return {
    changes: { from: head, insert },
    selection: { anchor: head + insert.length },
    scrollIntoView: true,
    userEvent: 'input',
  };
};

/** Backspace at the start of an empty requirement removes its line, and the caret goes to the end of the one above. */
export const removeEmptyKeyedLine = (state: EditorState): TransactionSpec | undefined => {
  const at = keyedLineAt(state);
  if (!at || state.selection.main.head !== at.textFrom || at.entry.inline.text !== '' || at.entry.lines.length > 0) {
    return undefined;
  }
  const line = state.doc.lineAt(at.guard.from);
  const from = Math.max(0, line.from - 1);
  return { changes: { from, to: line.to }, selection: { anchor: from }, userEvent: 'delete' };
};

const run =
  (command: (state: EditorState) => TransactionSpec | undefined) =>
  (view: EditorView): boolean => {
    if (view.state.readOnly || view.state.facet(specBlocksConfig).cards) {
      return false;
    }
    const spec = command(view.state);
    spec && view.dispatch(spec);
    return Boolean(spec);
  };

class KeyLabelWidget extends WidgetType {
  constructor(readonly label: string) {
    super();
  }

  override eq(other: KeyLabelWidget) {
    return other.label === this.label;
  }

  /** The editor takes a press on the label, so a drag can start there. */
  override ignoreEvent() {
    return false;
  }

  toDOM() {
    const span = document.createElement('span');
    span.className = 'cm-spec-key-label';
    span.textContent = this.label;
    span.dataset.testid = 'spec-block.key-label';
    return span;
  }
}

const decorate = (state: EditorState): DecorationSet =>
  state.facet(specBlocksConfig).cards
    ? Decoration.none
    : Decoration.set(
        keyLabels(state).map(({ from, to, label }) =>
          Decoration.replace({ widget: new KeyLabelWidget(label) }).range(from, to),
        ),
      );

/**
 * Each guard split at its key, so the caret steps over a key and the syntax around it, and a selection can stop at
 * either side of the label.
 */
const atomic = (state: EditorState): RangeSet<Decoration> => {
  if (state.facet(specBlocksConfig).cards) {
    return Decoration.none;
  }
  const mark = Decoration.mark({});
  return RangeSet.of(
    guards(state).flatMap(({ from, to, key }): Range<Decoration>[] => {
      const edges = [from, key.from, key.to, to];
      return edges.slice(1).flatMap((end, index) => (end > edges[index] ? [mark.range(edges[index], end)] : []));
    }),
  );
};

/** Copying a label alone copies the label, not the key the text stores under it. */
const copyLabel = EditorView.clipboardOutputFilter.of((text, state) => {
  const { ranges } = state.selection;
  if (state.facet(specBlocksConfig).cards || ranges.length !== 1 || ranges[0].empty) {
    return text;
  }
  const { from, to } = ranges[0];
  return keyLabels(state).find((label) => label.from <= from && to <= label.to)?.label ?? text;
});

/**
 * Where the blocks are text, each numbered item's key is drawn as its positional label (`F-3`), as its card does, and
 * cannot be edited: the caret steps over it, and an edit that would change part of it is dropped. Enter in a
 * requirement starts the next one with a fresh key; Backspace on an empty one removes it.
 */
export const keyLabelDecorations: Extension = [
  EditorView.decorations.compute([specBlocksField, specBlocksConfig], decorate),
  EditorView.atomicRanges.of((view) => atomic(view.state)),
  copyLabel,
  keepKeys,
  Prec.high(
    keymap.of([
      { key: 'Enter', run: run(continueKeyedLine) },
      { key: 'Backspace', run: run(removeEmptyKeyedLine) },
    ]),
  ),
  EditorView.theme({
    '.cm-spec-key-label': {
      textDecoration: 'underline dotted',
      textUnderlineOffset: '3px',
    },
  }),
];
