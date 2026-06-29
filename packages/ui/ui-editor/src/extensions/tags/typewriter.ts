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

import { Domino } from '@dxos/ui';

/** Annotate a transaction to bypass the typewriter buffer (content appears immediately). */
export const typewriterBypass = Annotation.define<boolean>();

/**
 * Public state effect signalling whether typewriter's drip queue is currently draining.
 * Other extensions can subscribe to coordinate behaviour with the typewriter (e.g. hide
 * a block-widget footer while text is being dripped to avoid scroll-measure conflicts).
 *
 * Dispatched at queue transitions:
 * - `true` — empty → non-empty (drain rAF/interval is starting).
 * - `false` — non-empty → empty (last char written, drain stopped).
 */
export const typewriterDrainingEffect = StateEffect.define<boolean>();

/**
 * Buffer state. The pending text is `text.slice(head)` — but `head` is advanced
 * without slicing on every drip to avoid O(n²) string copying. The prefix is
 * compacted lazily once it exceeds half the string or `COMPACT_HEAD_THRESHOLD`.
 */
type BufferState = { text: string; head: number; insertAt: number };

/** How long to show the cursor after motion has stopped. */
const CURSOR_LINGER = 3_000;

/** Per-frame time budget for draining the buffer. Stays well under a 16 ms frame. */
const FRAME_BUDGET_MS = 4;

/**
 * Visible characters of plain text emitted per animation frame. At 60 fps a value of 1
 * gives ~60 char/s — fast enough to keep up with most streams while still reading as a
 * smooth character-by-character drip. Atomic structures (XML elements, markdown links)
 * always flush whole regardless of this cap.
 */
const CHARS_PER_FRAME = 5;

/**
 * When the pending buffer exceeds this many characters, abandon typewriter pacing
 * and flush the entire buffer in one transaction. The visual benefit of typewriter
 * has negative value past human-reading rates.
 */
const FLUSH_THRESHOLD = 2_000;

/** Compaction trigger for the head-offset rope. */
const COMPACT_HEAD_THRESHOLD = 4_096;

export type TypewriterOptions = {
  /** Show a blinking cursor at the insertion point while streaming. */
  cursor?: boolean;
  /** Tag names whose inner content should be streamed (not buffered until close). */
  streamingTags?: Set<string>;
  /** Hard cap before falling back to single-flush mode. Defaults to 2 000 chars. */
  flushThreshold?: number;
  /** Per-frame time budget for draining (ms). Defaults to 20 ms. */
  frameBudgetMs?: number;
  /**
   * Maximum visible characters of plain text emitted per animation frame. Atomic
   * structures (XML elements, markdown links) always flush whole and are not subject
   * to this cap. Default 1 — ~60 char/s at 60 fps. Raise for faster typewriter speed.
   */
  charsPerFrame?: number;
};

/**
 * Intercepts appended text and inserts it as time-budgeted batches per animation frame,
 * while flushing XML tags, markdown links, and images atomically for smooth typewriter-style
 * streaming. Falls back to bulk-flush when the buffer grows past `flushThreshold` to keep
 * the editor responsive on long runs.
 */
export const typewriter = (options: TypewriterOptions = {}): Extension => {
  const streamingTags = options.streamingTags ?? new Set<string>();
  const flushThreshold = options.flushThreshold ?? FLUSH_THRESHOLD;
  const frameBudgetMs = options.frameBudgetMs ?? FRAME_BUDGET_MS;
  const charsPerFrame = options.charsPerFrame ?? CHARS_PER_FRAME;

  // Effect to suppress a transaction from being applied (replaced by buffered insert).
  const suppressAppend = StateEffect.define<{ from: number; text: string }>();
  // Effect to insert text from the buffer (single batch per frame).
  const insertChunk = StateEffect.define<{ from: number; text: string }>();

  // State field that holds the pending buffer of text to drip into the document.
  const bufferField = StateField.define<BufferState>({
    create: () => ({ text: '', head: 0, insertAt: 0 }),
    update: (value, tr) => {
      let { text, head, insertAt } = value;
      for (const effect of tr.effects) {
        if (effect.is(suppressAppend)) {
          // If pending was empty, anchor insertAt at the new append point.
          if (text.length === head) {
            insertAt = effect.value.from;
          }
          text += effect.value.text;
        }
        if (effect.is(insertChunk)) {
          head += effect.value.text.length;
          insertAt = effect.value.from + effect.value.text.length;
          // Compact lazily so the prefix doesn't grow without bound.
          if (head >= COMPACT_HEAD_THRESHOLD || (head > 0 && head * 2 >= text.length)) {
            text = text.slice(head);
            head = 0;
          }
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
          return { text: '', head: 0, insertAt: 0 };
        }

        // Map insertion position through document changes not caused by us.
        if (!tr.effects.some((effect) => effect.is(insertChunk))) {
          insertAt = tr.changes.mapPos(Math.min(insertAt, tr.startState.doc.length));
        }
      }

      return { text, head, insertAt };
    },
  });

  // Transaction filter: intercept appends at end-of-document and buffer them.
  const filter = EditorState.transactionFilter.of((tr: Transaction) => {
    if (!tr.docChanged) {
      return tr;
    }

    // Allow bypassed and drip insertions through.
    if (tr.annotation(typewriterBypass) || tr.effects.some((effect) => effect.is(insertChunk))) {
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

  // View plugin that drains the buffer once per animation frame, emitting as many atomic
  // chunks as fit within `frameBudgetMs`. Falls back to a single dispatch when the buffer
  // grows past `flushThreshold`.
  const drainPlugin = ViewPlugin.fromClass(
    class {
      _raf: number | undefined;
      _activeStreamTag: string | null = null;

      constructor(private view: EditorView) {
        // Note: do NOT eagerly start the drain here. The buffer is empty at construction,
        // and any synchronous `view.dispatch` inside the constructor is rejected by
        // CodeMirror because we're inside the initial update flow.
      }

      update(update: ViewUpdate) {
        const { text, head } = update.state.field(bufferField);
        const pending = text.length - head;
        if (pending === 0) {
          this._activeStreamTag = null;
        }
        if (pending > 0 && this._raf === undefined) {
          this._start();
        }
      }

      _start() {
        // Announce drain start. Deferred via microtask because `_start` runs from inside
        // `update()`, where synchronous `view.dispatch` is disallowed.
        queueMicrotask(() => {
          this.view.dispatch({
            effects: typewriterDrainingEffect.of(true),
            annotations: typewriterBypass.of(true),
          });
        });
        this._raf = requestAnimationFrame(this._tick);
      }

      _tick = () => {
        const { text, head, insertAt } = this.view.state.field(bufferField);
        const pending = text.length - head;

        if (pending === 0) {
          this.view.dispatch({
            effects: typewriterDrainingEffect.of(false),
            annotations: typewriterBypass.of(true),
          });
          this._raf = undefined;
          return;
        }

        // Backpressure: flush everything in one shot when the buffer is too large to
        // pace at typewriter rates. Streaming-tag context is dropped — anything still
        // buffered (including a closing tag, if present) lands as one chunk.
        if (pending > flushThreshold) {
          const chunk = text.slice(head);
          this._activeStreamTag = null;
          this.view.dispatch({
            changes: { from: insertAt, insert: chunk },
            effects: insertChunk.of({ from: insertAt, text: chunk }),
          });
          this._raf = requestAnimationFrame(this._tick);
          return;
        }

        // Time-budgeted batch: accumulate atomic chunks until we run out of budget,
        // hit an incomplete structure, exhaust the buffer, or hit the per-frame
        // visible-character cap. Atomic chunks (count > 1) are always emitted whole;
        // the cap only throttles plain-text drips so the typewriter cadence stays
        // visible at the per-frame level.
        const startTime = performance.now();
        let pos = head;
        let activeTag = this._activeStreamTag;
        let charsEmitted = 0;
        while (pos < text.length && performance.now() - startTime < frameBudgetMs) {
          const result = flushable(text, pos, streamingTags, activeTag);
          if (result.count === 0) {
            // Head is inside an incomplete structure — wait for more data.
            break;
          }
          // Stop after the per-frame cap, but only once we've already emitted at
          // least one chunk this frame — otherwise a multi-char atomic structure
          // (e.g. a markdown link) could starve forever on a small cap.
          if (charsEmitted > 0 && charsEmitted + result.count > charsPerFrame) {
            break;
          }
          if (result.enterTag) {
            activeTag = result.enterTag;
          }
          if (result.exitTag) {
            activeTag = null;
          }
          pos += result.count;
          charsEmitted += result.count;
        }

        const totalCount = pos - head;
        if (totalCount > 0) {
          const chunk = text.slice(head, head + totalCount);
          this._activeStreamTag = activeTag;
          this.view.dispatch({
            changes: { from: insertAt, insert: chunk },
            effects: insertChunk.of({ from: insertAt, text: chunk }),
          });
        }

        // Continue draining next frame; if pending is 0 after the dispatch, the next
        // tick will land on the early-out above and stop the loop.
        this._raf = requestAnimationFrame(this._tick);
      };

      destroy() {
        if (this._raf !== undefined) {
          cancelAnimationFrame(this._raf);
        }
      }
    },
  );

  return [bufferField, filter, drainPlugin, options.cursor && typewriterCursor(bufferField)].filter(
    Boolean,
  ) as Extension[];
};

//
// Cursor
//

/**
 * Blinking cursor widget at the insertion point while the buffer is draining.
 * Lingers for 2s after the buffer empties before being removed.
 */
const typewriterCursor = (bufferField: StateField<BufferState>): Extension => {
  const hideCursor = StateEffect.define();

  const visibilityField = StateField.define<{
    visible: boolean;
    insertAt: number;
    /** Position after the last non-whitespace character was inserted. */
    lastNonWsAt: number;
  }>({
    create: () => ({ visible: false, insertAt: 0, lastNonWsAt: 0 }),
    update: (value, tr) => {
      const { text, head, insertAt } = tr.state.field(bufferField);
      const pending = text.length - head;
      if (pending > 0) {
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

      const { text, head } = tr.state.field(bufferField);
      // While draining, show cursor at the insertion point.
      // When lingering (buffer empty), show at last non-whitespace position.
      const cursorAt = text.length > head ? insertAt : lastNonWsAt;
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
      _timer: ReturnType<typeof setTimeout> | undefined;

      constructor(private view: EditorView) {}

      update(update: ViewUpdate) {
        const { text, head } = update.state.field(bufferField);
        const { visible } = update.state.field(visibilityField);
        const pending = text.length - head;

        if (pending > 0) {
          clearTimeout(this._timer);
          this._timer = undefined;
        } else if (visible && this._timer === undefined) {
          this._timer = setTimeout(() => {
            this.view.dispatch({ effects: hideCursor.of(null) });
            this._timer = undefined;
          }, CURSOR_LINGER);
        }
      }

      destroy() {
        clearTimeout(this._timer);
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
  // All instances are interchangeable — let CM reuse the existing DOM across drips so
  // the blink animation isn't restarted on every transaction.
  override eq(other: WidgetType): boolean {
    return other instanceof CursorWidget;
  }

  toDOM() {
    const inner = Domino.of('span').text('∗').style({ animation: 'blink 1s infinite', animationDelay: '250ms' });
    return Domino.of('span').style({ opacity: '0.8' }).append(inner).root;
  }
}

/**
 * Matches the local name of an opening tag after `<` (not `</`).
 * Custom elements use hyphens; `\w+` alone incorrectly stops at `-` (e.g. `dom` from `dom-widget`).
 */
const OPENING_TAG_NAME = /^<([a-zA-Z][\w-]*)/;

/** Tag names are short — bound the slice we hand to the regex matcher. */
const TAG_NAME_PROBE = 64;

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
 * Scans the buffer starting at `start` and returns the number of characters that can be
 * flushed. Returns 0 if the head of the buffer is inside an incomplete structure (XML
 * element, markdown link, or image) that should be flushed atomically. Returns > 1 when
 * a complete structure is at the head and should be emitted in one batch.
 *
 * When `activeStreamTag` is set, we're inside a streaming tag: inner content drips one
 * character at a time, and the closing tag is flushed atomically.
 */
const flushable = (
  buffer: string,
  start: number,
  streamingTags: Set<string>,
  activeStreamTag: string | null,
): FlushResult => {
  if (start >= buffer.length) {
    return { count: 0 };
  }

  // Inside a streaming tag: drip content, flush closing tag atomically.
  if (activeStreamTag) {
    const closeTag = `</${activeStreamTag}>`;
    if (buffer.startsWith(closeTag, start)) {
      return { count: closeTag.length, exitTag: true };
    }
    // Nested XML element — buffer atomically.
    if (buffer[start] === '<') {
      return { count: xmlElementLength(buffer, start) };
    }
    // Drip inner content one character at a time.
    return { count: 1 };
  }

  const ch = buffer[start];

  // XML element.
  if (ch === '<') {
    // Tag-name match against a bounded slice (tag names are short).
    const probe = buffer.slice(start, start + TAG_NAME_PROBE);
    const nameMatch = probe.match(OPENING_TAG_NAME);
    if (nameMatch && streamingTags.has(nameMatch[1])) {
      const close = buffer.indexOf('>', start);
      if (close === -1) {
        return { count: 0 }; // Opening tag incomplete.
      }
      // Self-closing streaming tag — flush atomically, no streaming mode.
      if (buffer[close - 1] === '/') {
        return { count: close + 1 - start };
      }
      // Flush opening tag and enter streaming mode.
      return { count: close + 1 - start, enterTag: nameMatch[1] };
    }
    // Non-streaming XML: buffer the entire element.
    return { count: xmlElementLength(buffer, start) };
  }

  // Image: ![alt](url) — starts with '!'.
  if (ch === '!' && buffer.length > start + 1 && buffer[start + 1] === '[') {
    return { count: linkLength(buffer, start, start + 1) };
  }

  // Link: [text](url).
  if (ch === '[') {
    return { count: linkLength(buffer, start, start) };
  }

  return { count: 1 };
};

/**
 * Returns the length of a complete XML element starting at `start`, or 0 if the element
 * is incomplete. Handles self-closing tags, closing tags, and opening tags with nested
 * content. E.g., `<foo>content<bar />more</foo>` returns the full length.
 */
export const xmlElementLength = (buffer: string, start = 0): number => {
  const close = buffer.indexOf('>', start);
  if (close === -1) {
    return 0; // Tag not closed yet.
  }

  // Self-closing tag: <foo />.
  if (buffer[close - 1] === '/') {
    return close + 1 - start;
  }

  // Closing tag: </foo>.
  if (buffer[start + 1] === '/') {
    return close + 1 - start;
  }

  // Opening tag: extract the tag name and find its matching closing tag.
  const probe = buffer.slice(start, start + TAG_NAME_PROBE);
  const nameMatch = probe.match(OPENING_TAG_NAME);
  if (!nameMatch) {
    // Not a valid tag (e.g., `< ` or `<123`); emit one character.
    return 1;
  }

  const tagName = nameMatch[1];
  let depth = 0;

  // Walk through all tags in the buffer tracking nesting depth, starting at `start`.
  const tagPattern = new RegExp(`<(/?)${escapeRegExpSource(tagName)}(\\s[^>]*)?>`, 'g');
  tagPattern.lastIndex = start;
  let match: RegExpExecArray | null;
  while ((match = tagPattern.exec(buffer)) !== null) {
    const isSelfClosing = match[0].endsWith('/>');
    const isClosing = match[1] === '/';

    if (isSelfClosing) {
      // Self-closing doesn't change depth, but if depth is 0 this is the root.
      if (depth === 0) {
        return match.index + match[0].length - start;
      }
    } else if (isClosing) {
      depth--;
      if (depth === 0) {
        return match.index + match[0].length - start;
      }
    } else {
      depth++;
    }
  }

  // Unbalanced — still waiting for closing tag.
  return 0;
};

/**
 * Returns the length (from `start`) of a complete markdown link/image whose `[` is at
 * `bracketAt`, or 0 if the structure is incomplete. Returns 1 if the bracket is not part
 * of a link (no following `(`).
 */
const linkLength = (buffer: string, start: number, bracketAt: number): number => {
  const bracketClose = buffer.indexOf(']', bracketAt + 1);
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

  return parenClose + 1 - start;
};
