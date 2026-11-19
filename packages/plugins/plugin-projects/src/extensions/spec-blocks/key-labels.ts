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

/** Text the user cannot edit in part: a numbered item's key with the syntax around it. */
export type Guard = { from: number; to: number; item: SpecItem };

const TOKEN = /[A-Za-z0-9][\w-]*/g;

/**
 * Every place the text writes the key of a numbered item: a block's id, a keyed line's key, and a reference field's
 * value that names one. In document order.
 */
export const keyLabels = (state: EditorState): KeyLabel[] => {
  const { items, schemas, blocks } = state.field(specBlocksField);
  const labels = labelsByKey(items);
  const result: KeyLabel[] = [];
  for (const { key, label, block, entry } of items) {
    const range = entry ? entry.keyRange : block.header.id;
    if (label && range) {
      result.push({ ...range, key, label });
    }
  }

  for (const block of blocks) {
    const references = new Set(
      schemas
        .get(block.kind)
        ?.fields.filter(isReferenceField)
        .map(({ name }) => name),
    );
    for (const field of block.fields) {
      if (!references.has(field.name)) {
        continue;
      }
      for (const line of [field.inline, ...field.lines]) {
        for (const match of line.text.matchAll(TOKEN)) {
          const label = labels.get(match[0]);
          if (label) {
            const from = line.from + match.index;
            result.push({ from, to: from + match[0].length, key: match[0], label });
          }
        }
      }
    }
  }

  return result.sort((a, b) => a.from - b.from);
};

/** The end of `req <key>: ` on a keyed line: its colon and the one space after it. */
const prefixEnd = (text: string, keyEnd: number) => {
  const colon = text[keyEnd] === ':' ? keyEnd + 1 : keyEnd;
  return text[colon] === ' ' ? colon + 1 : colon;
};

/** Guards by the blocks they were read from, which change with every edit of the text. */
const guardCache = new WeakMap<object, Guard[]>();

/**
 * The text around each numbered item's key that an edit must change whole or not at all: a keyed line from its line's
 * start through `req <key>: `, and a block's id with the space before it and the colon after it.
 */
export const guards = (state: EditorState): Guard[] => {
  const blocks = state.field(specBlocksField);
  const cached = guardCache.get(blocks);
  if (cached) {
    return cached;
  }
  const text = state.doc.toString();
  const result = blocks.items
    .flatMap((item): Guard[] => {
      if (!item.label) {
        return [];
      }
      if (item.entry?.keyRange) {
        const from = state.doc.lineAt(item.entry.from).from;
        return [{ from, to: prefixEnd(text, item.entry.keyRange.to), item }];
      }
      const id = item.block.header.id;
      if (!id) {
        return [];
      }
      const from = text[id.from - 1] === ' ' ? id.from - 1 : id.from;
      return [{ from, to: text[id.to] === ':' ? id.to + 1 : id.to, item }];
    })
    .sort((a, b) => a.from - b.from);
  guardCache.set(blocks, result);
  return result;
};

/** The whole of what a guard keeps: a keyed line through its text, a block's header line. */
const extent = (state: EditorState, { from, item }: Guard) =>
  item.entry ? { from, to: Math.max(item.entry.to, from) } : state.doc.lineAt(item.block.header.from);

/**
 * Whether a change breaks a guard: it edits inside one, or joins its line to the one above, without removing all of
 * what the guard keeps.
 */
const breaks = (state: EditorState, guard: Guard, from: number, to: number) => {
  const inside = from === to ? from > guard.from && from < guard.to : from < guard.to && to > guard.from;
  const joins = guard.item.entry !== undefined && to === guard.from && from < guard.from;
  if (!inside && !joins) {
    return false;
  }
  const whole = extent(state, guard);
  return !(from <= whole.from && to >= whole.to);
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
  transaction.changes.iterChangedRanges((from, to) => {
    broken ||= kept.some((guard) => breaks(startState, guard, from, to));
  });
  return broken ? [] : transaction;
});

/** The keyed line of a numbered item whose text holds the caret, and where that text starts. */
const keyedLineAt = (state: EditorState) => {
  const head = state.selection.main;
  if (!head.empty) {
    return undefined;
  }
  const guard = guards(state).find(
    ({ item, to }) => item.entry && head.head >= to && head.head <= Math.max(item.entry.to, to),
  );
  return guard && { guard, entry: guard.item.entry!, textFrom: guard.to };
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
    guards(state).flatMap(({ from, to, item }): Range<Decoration>[] => {
      const key = item.entry ? item.entry.keyRange : item.block.header.id;
      const edges = key ? [from, key.from, key.to, to] : [from, to];
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
