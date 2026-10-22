//
// Copyright 2026 DXOS.org
//

import { type EditorState, type Extension, RangeSetBuilder } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, WidgetType } from '@codemirror/view';

import { type SourceKey, formatSourceKey } from '#sync';

import { type Annotation } from '../SpecModel/index.ts';

/** A block declaration line, `feat F-1: …`, `  req F-1.2: …` or `type Scene`, captured as its id. */
const DECLARATION = /^\s*[a-z]+\s+([A-Za-z][\w.-]*)\s*(?::|$)/;

/** More chips than this collapse into a `+n` chip whose tooltip lists the rest. */
const MAX_CHIPS = 3;

const labelOf = (key: SourceKey): string => key.fragment ?? key.path.split('/').pop() ?? key.path;

class ImplementationWidget extends WidgetType {
  constructor(
    readonly keys: readonly SourceKey[],
    readonly onOpen: (key: SourceKey) => void,
  ) {
    super();
  }

  override eq(other: ImplementationWidget): boolean {
    return other.keys.map((key) => formatSourceKey(key)).join() === this.keys.map((key) => formatSourceKey(key)).join();
  }

  override toDOM(): HTMLElement {
    // Floated into the right margin like the decision chips, so the annotated line's text does not move.
    const row = document.createElement('span');
    row.className = 'float-right flex flex-wrap justify-end gap-1 ms-2 select-none';
    const chip = (text: string, title: string, onClick: () => void) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.title = title;
      button.dataset.testid = 'spec-editor.implementation-chip';
      button.className =
        'inline-flex items-center gap-0.5 px-1 rounded-sm text-xs leading-5 font-mono cursor-pointer ' +
        'border border-dashed border-amber-border text-amber-text';
      button.textContent = text;
      button.addEventListener('click', onClick);
      row.appendChild(button);
    };
    this.keys
      .slice(0, MAX_CHIPS)
      .forEach((key) => chip(`</> ${labelOf(key)}`, formatSourceKey(key), () => this.onOpen(key)));
    const rest = this.keys.slice(MAX_CHIPS);
    if (rest.length > 0) {
      chip(`+${rest.length}`, rest.map((key) => formatSourceKey(key)).join('\n'), () => this.onOpen(rest[0]));
    }
    return row;
  }

  override ignoreEvent(): boolean {
    return false;
  }
}

const buildDecorations = (
  state: EditorState,
  byId: Map<string, readonly SourceKey[]>,
  onOpen: (key: SourceKey) => void,
): DecorationSet => {
  const builder = new RangeSetBuilder<Decoration>();
  const seen = new Set<string>();
  for (let number = 1; number <= state.doc.lines; number++) {
    const line = state.doc.line(number);
    const id = DECLARATION.exec(line.text)?.[1];
    const keys = id && !seen.has(id) ? byId.get(id) : undefined;
    if (id && keys) {
      // The first declaration is the item; a later mention (a changelog's `affects:`) is not.
      seen.add(id);
      builder.add(
        line.from,
        line.from,
        Decoration.widget({ widget: new ImplementationWidget(keys, onOpen), side: -1 }),
      );
    }
  }
  return builder.finish();
};

/**
 * Chips in the margin of each spec item linking it to the code that implements it. The links are annotations from
 * outside the spec (a review's evidence), not spec text, so they render as decorations like the decision chips.
 */
export const implementationChips = (
  annotations: readonly Annotation[],
  onOpen: (key: SourceKey) => void,
): Extension => {
  const byId = new Map(annotations.map(({ id, keys }) => [id, keys]));
  return EditorView.decorations.compute(['doc'], (state) => buildDecorations(state, byId, onOpen));
};
