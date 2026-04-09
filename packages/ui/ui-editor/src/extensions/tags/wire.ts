//
// Copyright 2025 DXOS.org
//

import {
  Annotation,
  ChangeSet,
  EditorState,
  type Extension,
  StateEffect,
  StateField,
  type Transaction,
} from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from '@codemirror/view';

/** Annotate a transaction to bypass the wire buffer (content appears immediately). */
export const wireBypass = Annotation.define<boolean>();

import { Domino } from '@dxos/ui';

/**
 * Scans the buffer and returns the number of characters that can be flushed.
 * Returns 0 if the head of the buffer is inside an incomplete structure
 * (XML element, markdown link, or image) that should be flushed atomically.
 * Returns > 1 when a complete structure is at the head and should be emitted in one batch.
 */
const flushable = (buffer: string): number => {
  if (buffer.length === 0) {
    return 0;
  }

  const ch = buffer[0];

  // XML element: buffer the entire element including content and closing tag.
  if (ch === '<') {
    return xmlElementLength(buffer);
  }

  // Image: ![alt](url) — starts with '!'.
  if (ch === '!' && buffer.length > 1 && buffer[1] === '[') {
    return linkLength(buffer, 1);
  }

  // Link: [text](url).
  if (ch === '[') {
    return linkLength(buffer, 0);
  }

  return 1;
};

/**
 * Returns the length of a complete XML element at the start of the buffer,
 * or 0 if the element is incomplete.
 * Handles self-closing tags, closing tags, and opening tags with nested content.
 * E.g., `<foo>content<bar />more</foo>` returns the full length.
 */
const xmlElementLength = (buffer: string): number => {
  const close = buffer.indexOf('>');
  if (close === -1) {
    return 0; // Tag not closed yet.
  }

  // Self-closing tag: <foo />.
  if (buffer[close - 1] === '/') {
    return close + 1;
  }

  // Closing tag: </foo>.
  if (buffer[1] === '/') {
    return close + 1;
  }

  // Opening tag: extract the tag name and find its matching closing tag.
  const nameMatch = buffer.match(/^<(\w+)/);
  if (!nameMatch) {
    // Not a valid tag (e.g., `< ` or `<123`); emit one character.
    return 1;
  }

  const tagName = nameMatch[1];
  let depth = 0;

  // Walk through all tags in the buffer tracking nesting depth.
  const tagPattern = new RegExp(`<(/?)${tagName}(\\s[^>]*)?>`, 'g');
  let match: RegExpExecArray | null;
  while ((match = tagPattern.exec(buffer)) !== null) {
    const isSelfClosing = match[0].endsWith('/>');
    const isClosing = match[1] === '/';

    if (isSelfClosing) {
      // Self-closing doesn't change depth, but if depth is 0 this is the root.
      if (depth === 0) {
        return match.index + match[0].length;
      }
    } else if (isClosing) {
      depth--;
      if (depth === 0) {
        return match.index + match[0].length;
      }
    } else {
      depth++;
    }
  }

  // Unbalanced — still waiting for closing tag.
  return 0;
};

/**
 * Returns the length of a complete markdown link/image starting at `offset`,
 * or 0 if the structure is incomplete.
 * Expects buffer[offset] === '['.
 */
const linkLength = (buffer: string, offset: number): number => {
  const bracketClose = buffer.indexOf(']', offset + 1);
  if (bracketClose === -1) {
    return 0;
  }

  // Must be followed by '(' for a standard link.
  if (bracketClose + 1 >= buffer.length) {
    return 0;
  }
  if (buffer[bracketClose + 1] !== '(') {
    // Not a link — just a bracket; emit one character.
    return 1;
  }

  const parenClose = buffer.indexOf(')', bracketClose + 2);
  if (parenClose === -1) {
    return 0;
  }

  return parenClose + 1;
};

type BufferState = { text: string; insertAt: number };

const DEFAULT_RATE = 200;
const CURSOR_LINGER = 2_000;

export type WireOptions = {
  /** Characters per second. */
  rate?: number;
  /** Show a blinking cursor at the insertion point while streaming. */
  cursor?: boolean;
};

/**
 * Extension that intercepts appended text and inserts it one character at a time,
 * except for XML tags, links, and images which are flushed atomically.
 */
export const wire = (options: WireOptions = {}): Extension => {
  const rate = options.rate ?? DEFAULT_RATE;
  const interval = 1_000 / rate;

  // Effect to suppress a transaction from being applied (replaced by buffered insert).
  const suppressAppend = StateEffect.define<{ from: number; text: string }>();
  // Effect to insert text from the buffer (single char or atomic chunk).
  const insertChunk = StateEffect.define<{ from: number; text: string }>();

  // State field that holds the pending buffer of text to drip into the document.
  const bufferField = StateField.define<BufferState>({
    create: () => ({ text: '', insertAt: 0 }),
    update: (value, tr) => {
      let { text, insertAt } = value;

      for (const effect of tr.effects) {
        if (effect.is(suppressAppend)) {
          text += effect.value.text;
          if (text.length === effect.value.text.length) {
            insertAt = effect.value.from;
          }
        }
        if (effect.is(insertChunk)) {
          text = text.slice(effect.value.text.length);
          insertAt = effect.value.from + effect.value.text.length;
        }
      }

      // Reset buffer when document is cleared or fully replaced.
      if (tr.docChanged) {
        let isReset = tr.state.doc.length === 0;
        if (!isReset && tr.startState.doc.length > 0) {
          tr.changes.iterChanges((fromA, toA) => {
            if (fromA === 0 && toA === tr.startState.doc.length) {
              isReset = true;
            }
          });
        }
        if (isReset) {
          return { text: '', insertAt: 0 };
        }

        // Map insertion position through document changes not caused by us.
        if (!tr.effects.some((effect) => effect.is(insertChunk))) {
          insertAt = tr.changes.mapPos(Math.min(insertAt, tr.startState.doc.length));
        }
      }

      return { text, insertAt };
    },
  });

  // Transaction filter: intercept appends at end-of-document and buffer them.
  const filter = EditorState.transactionFilter.of((tr: Transaction) => {
    if (!tr.docChanged) {
      return tr;
    }

    // Allow bypassed and drip insertions through.
    if (tr.annotation(wireBypass) || tr.effects.some((effect) => effect.is(insertChunk))) {
      return tr;
    }

    // Collect appended text at the end of the document.
    let appendedText = '';
    let appendFrom = -1;
    let isAppendOnly = true;

    tr.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
      if (toA === tr.startState.doc.length && fromA === toA && inserted.length > 0) {
        appendedText += inserted.sliceString(0);
        if (appendFrom === -1) {
          appendFrom = fromA;
        }
      } else {
        isAppendOnly = false;
      }
    });

    if (!isAppendOnly || appendedText.length === 0) {
      return tr;
    }

    // Suppress the original insert; buffer the text instead.
    return {
      changes: ChangeSet.empty(tr.startState.doc.length),
      effects: suppressAppend.of({ from: appendFrom, text: appendedText }),
    };
  });

  // View plugin that drains the buffer, emitting one character or one atomic chunk per tick.
  const drainPlugin = ViewPlugin.fromClass(
    class {
      #timer: ReturnType<typeof setInterval> | undefined;

      constructor(private view: EditorView) {
        this.#start();
      }

      update(update: ViewUpdate) {
        const buffer = update.state.field(bufferField);
        if (buffer.text.length > 0 && this.#timer === undefined) {
          this.#start();
        }
      }

      #start() {
        this.#timer = setInterval(() => {
          const { text, insertAt } = this.view.state.field(bufferField);
          if (text.length === 0) {
            clearInterval(this.#timer);
            this.#timer = undefined;
            return;
          }

          const count = flushable(text);
          if (count === 0) {
            // Structure incomplete — wait for more data.
            return;
          }

          const chunk = text.slice(0, count);
          this.view.dispatch({
            changes: { from: insertAt, insert: chunk },
            effects: insertChunk.of({ from: insertAt, text: chunk }),
          });
        }, interval);
      }

      destroy() {
        clearInterval(this.#timer);
      }
    },
  );

  return [bufferField, filter, drainPlugin, options.cursor && wireCursor(bufferField)].filter(Boolean) as Extension[];
};

//
// Cursor
//

/**
 * Blinking cursor widget at the insertion point while the buffer is draining.
 * Lingers for 2s after the buffer empties before being removed.
 */
const wireCursor = (bufferField: StateField<BufferState>): Extension => {
  const hideCursor = StateEffect.define();

  const visibilityField = StateField.define<{ visible: boolean; insertAt: number }>({
    create: () => ({ visible: false, insertAt: 0 }),
    update: (value, tr) => {
      const { text, insertAt } = tr.state.field(bufferField);
      if (text.length > 0) {
        return { visible: true, insertAt };
      }
      for (const effect of tr.effects) {
        if (effect.is(hideCursor)) {
          return { visible: false, insertAt: value.insertAt };
        }
      }
      return value;
    },
  });

  const decorationField = StateField.define<DecorationSet>({
    create: () => Decoration.none,
    update: (_decorations, tr) => {
      const { visible, insertAt } = tr.state.field(visibilityField);
      if (!visible) {
        return Decoration.none;
      }

      const pos = Math.min(insertAt, tr.state.doc.length);
      return Decoration.set([
        Decoration.widget({
          widget: new CursorWidget(),
          side: 1,
        }).range(pos),
      ]);
    },
    provide: (field) => EditorView.decorations.from(field),
  });

  const timerPlugin = ViewPlugin.fromClass(
    class {
      #timer: ReturnType<typeof setTimeout> | undefined;

      constructor(private view: EditorView) {}

      update(update: ViewUpdate) {
        const { text } = update.state.field(bufferField);
        const { visible } = update.state.field(visibilityField);

        if (text.length > 0) {
          clearTimeout(this.#timer);
          this.#timer = undefined;
        } else if (visible && this.#timer === undefined) {
          this.#timer = setTimeout(() => {
            this.view.dispatch({ effects: hideCursor.of(null) });
            this.#timer = undefined;
          }, CURSOR_LINGER);
        }
      }

      destroy() {
        clearTimeout(this.#timer);
      }
    },
  );

  return [visibilityField, decorationField, timerPlugin];
};

class CursorWidget extends WidgetType {
  toDOM() {
    const inner = Domino.of('span').text('\u25CF').style({ animation: 'blink 1s infinite', animationDelay: '500ms' });
    return Domino.of('span').style({ opacity: '0.8' }).children(inner).root;
  }
}
