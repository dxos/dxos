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
 * Matches the local name of an opening tag after `<` (not `</`).
 * Custom elements use hyphens; `\w+` alone incorrectly stops at `-` (e.g. `dom` from `dom-widget`).
 */
const OPENING_TAG_NAME = /^<([a-zA-Z][\w-]*)/;

/** Escapes a string for safe embedding in RegExp source (tag names from the document). */
const escapeRegExpSource = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

type FlushResult = {
  count: number;
  /** Tag name to enter streaming mode for. */
  enterTag?: string;
  /** Whether to exit streaming mode. */
  exitTag?: boolean;
};

/**
 * Scans the buffer and returns the number of characters that can be flushed.
 * Returns 0 if the head of the buffer is inside an incomplete structure
 * (XML element, markdown link, or image) that should be flushed atomically.
 * Returns > 1 when a complete structure is at the head and should be emitted in one batch.
 *
 * When `activeStreamTag` is set, we're inside a streaming tag: inner content drips
 * one character at a time, and the closing tag is flushed atomically.
 */
const flushable = (buffer: string, streamingTags: Set<string>, activeStreamTag: string | null): FlushResult => {
  if (buffer.length === 0) {
    return { count: 0 };
  }

  // Inside a streaming tag: drip content, flush closing tag atomically.
  if (activeStreamTag) {
    const closeTag = `</${activeStreamTag}>`;
    if (buffer.startsWith(closeTag)) {
      return { count: closeTag.length, exitTag: true };
    }
    // Nested XML element — buffer atomically.
    if (buffer[0] === '<') {
      return { count: xmlElementLength(buffer) };
    }
    // Drip inner content one character at a time.
    return { count: 1 };
  }

  const ch = buffer[0];

  // XML element.
  if (ch === '<') {
    // Check if this is a streaming tag's opening tag.
    const nameMatch = buffer.match(OPENING_TAG_NAME);
    if (nameMatch && streamingTags.has(nameMatch[1])) {
      const close = buffer.indexOf('>');
      if (close === -1) {
        return { count: 0 }; // Opening tag incomplete.
      }
      // Self-closing streaming tag — flush atomically, no streaming mode.
      if (buffer[close - 1] === '/') {
        return { count: close + 1 };
      }
      // Flush opening tag and enter streaming mode.
      return { count: close + 1, enterTag: nameMatch[1] };
    }
    // Non-streaming XML: buffer the entire element.
    return { count: xmlElementLength(buffer) };
  }

  // Image: ![alt](url) — starts with '!'.
  if (ch === '!' && buffer.length > 1 && buffer[1] === '[') {
    return { count: linkLength(buffer, 1) };
  }

  // Link: [text](url).
  if (ch === '[') {
    return { count: linkLength(buffer, 0) };
  }

  return { count: 1 };
};

/**
 * Returns the length of a complete XML element at the start of the buffer, or 0 if the element is incomplete.
 * Handles self-closing tags, closing tags, and opening tags with nested content.
 * E.g., `<foo>content<bar />more</foo>` returns the full length.
 */
export const xmlElementLength = (buffer: string): number => {
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
  const nameMatch = buffer.match(OPENING_TAG_NAME);
  if (!nameMatch) {
    // Not a valid tag (e.g., `< ` or `<123`); emit one character.
    return 1;
  }

  const tagName = nameMatch[1];
  let depth = 0;

  // Walk through all tags in the buffer tracking nesting depth.
  const tagPattern = new RegExp(`<(/?)${escapeRegExpSource(tagName)}(\\s[^>]*)?>`, 'g');
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
const CURSOR_LINGER = 3_000;

export type WireOptions = {
  /** Characters per second. */
  rate?: number;
  /** Show a blinking cursor at the insertion point while streaming. */
  cursor?: boolean;
  /** Tag names whose inner content should be streamed (not buffered until close). */
  streamingTags?: Set<string>;
};

/**
 * Extension that intercepts appended text and inserts it one character at a time,
 * except for XML tags, links, and images which are flushed atomically.
 */
export const wire = (options: WireOptions = {}): Extension => {
  const rate = options.rate ?? DEFAULT_RATE;
  const interval = 1_000 / rate;
  const streamingTags = options.streamingTags ?? new Set<string>();

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
      #activeStreamTag: string | null = null;

      constructor(private view: EditorView) {
        this.#start();
      }

      update(update: ViewUpdate) {
        const buffer = update.state.field(bufferField);
        // Reset streaming state when buffer is cleared (e.g., document reset).
        if (buffer.text.length === 0) {
          this.#activeStreamTag = null;
        }
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

          const result = flushable(text, streamingTags, this.#activeStreamTag);
          if (result.count === 0) {
            // Structure incomplete — wait for more data.
            return;
          }

          if (result.enterTag) {
            this.#activeStreamTag = result.enterTag;
          }
          if (result.exitTag) {
            this.#activeStreamTag = null;
          }

          const chunk = text.slice(0, result.count);
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

  const visibilityField = StateField.define<{
    visible: boolean;
    insertAt: number;
    /** Position after the last non-whitespace character was inserted. */
    lastNonWsAt: number;
  }>({
    create: () => ({ visible: false, insertAt: 0, lastNonWsAt: 0 }),
    update: (value, tr) => {
      const { text, insertAt } = tr.state.field(bufferField);
      if (text.length > 0) {
        // Track the last position where a non-whitespace character was inserted.
        let lastNonWsAt = tr.changes.mapPos(Math.min(value.lastNonWsAt, tr.startState.doc.length));
        if (tr.docChanged) {
          tr.changes.iterChanges((_fromA, _toA, _fromB, _toB, inserted) => {
            const chunk = inserted.sliceString(0);
            if (chunk.trim().length > 0) {
              lastNonWsAt = _fromB + chunk.length;
            }
          });
        }
        return { visible: true, insertAt, lastNonWsAt };
      }
      for (const effect of tr.effects) {
        if (effect.is(hideCursor)) {
          return { ...value, visible: false };
        }
      }
      return value;
    },
  });

  const decorationField = StateField.define<DecorationSet>({
    create: () => Decoration.none,
    update: (_decorations, tr) => {
      const { visible, insertAt, lastNonWsAt } = tr.state.field(visibilityField);
      if (!visible) {
        return Decoration.none;
      }

      const { text } = tr.state.field(bufferField);
      // While draining, show cursor at the insertion point.
      // When lingering (buffer empty), show at last non-whitespace position.
      const cursorAt = text.length > 0 ? insertAt : lastNonWsAt;
      const pos = Math.min(cursorAt, tr.state.doc.length);
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

/**
 * U+2217 Asterisk
 * U+25CF Ballot Box
 */
class CursorWidget extends WidgetType {
  toDOM() {
    const inner = Domino.of('span').text('\u2217').style({ animation: 'blink 1s infinite', animationDelay: '250ms' });
    return Domino.of('span').style({ opacity: '0.8' }).append(inner).root;
  }
}
