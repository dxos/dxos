//
// Copyright 2025 DXOS.org
//

import { type DXN } from '@dxos/echo';
import { type MarkdownStreamController } from '@dxos/react-ui-components';
import { type ContentBlock, type Message } from '@dxos/types';
import { type StateDispatch, type XmlWidgetStateManager } from '@dxos/ui-editor';

import { rehydrateToolWidgetsFromMessages } from './tool-widget-state';

/**
 * Update document.
 */
export type TextModel = Pick<MarkdownStreamController, 'length' | 'setContent' | 'append' | 'updateWidget'>;

/**
 * Renders a block to markdown.
 *
 * Contract: for any block whose lifetime spans multiple invocations (i.e. a streaming block
 * with `pending: true` whose content grows over time, transitioning to `pending: false`), the
 * sequence of returned strings must be monotonically extending — each subsequent value must be
 * a string-extension of the previous. The {@link MessageSyncer} relies on this invariant to
 * compute appendable deltas without diffing.
 */
export type BlockRenderer = (
  context: MessageThreadContext,
  message: Message.Message,
  block: ContentBlock.Any,
) => string | undefined;

/**
 * Thread context passed to renderer.
 */
export class MessageThreadContext implements Pick<MarkdownStreamController, 'updateWidget'> {
  constructor(private readonly _widgetState?: XmlWidgetStateManager) {}

  updateWidget<T>(id: string, value: StateDispatch<T>) {
    this._widgetState?.updateWidget(id, value);
  }

  // TODO(burdon): Resolve name from hypergraph.
  getObjectLabel(_id: DXN) {
    return 'Object';
  }
}

/**
 * Syncs messages with the editor.
 *
 * Reflects the AI streaming contract:
 * - Messages and their blocks are appended in order.
 * - Only the last block in `messages` may be `pending`; all earlier blocks are finalized.
 * - The renderer's output for a streaming block grows monotonically (see {@link BlockRenderer}).
 * - The document is read-only outside this syncer.
 *
 * Under those rules the syncer needs only:
 * - `_completed`: the flat-block index past which everything has been fully appended.
 * - `_trailing`: chars of the in-flight block (at index `_completed`) already appended.
 * - `_threadId`: identity sentinel; if `messages[0]?.id` changes, the document is replaced.
 */
export class MessageSyncer {
  private _threadId?: string;
  private _completed = 0;
  private _trailing = 0;

  private readonly _context: MessageThreadContext;

  constructor(
    private readonly _document: TextModel,
    private readonly _renderer: BlockRenderer,
  ) {
    this._context = new MessageThreadContext(this._document);
  }

  get context() {
    return this._context;
  }

  /**
   * Replace the document with the rendering of `messages`. Use on mount, on thread switch,
   * and from {@link update} when it detects an identity change in `messages[0]`.
   */
  reset(messages: Message.Message[] = []): void {
    this._threadId = messages[0]?.id;
    this._completed = 0;
    this._trailing = 0;
    const buffer = this._walk(messages);
    // Match the pre-rewrite behaviour: rendering from a steady state (initial mount with
    // non-empty messages, or thread switch) lands the entire content via `setContent` — which
    // uses `wireBypass`, so the editor jumps straight to the final text and `update()` returns
    // `true` so the caller can scroll to the bottom. Live streaming partials that arrive
    // *after* this initial render flow through `update()`'s incremental path → `_document.append`
    // → wire's drip filter, preserving the char-by-char typewriter for incoming text.
    void this._document.setContent(buffer).then(() => {
      rehydrateToolWidgetsFromMessages(this._context, messages);
    });
  }

  /**
   * Stream the suffix of the rendered messages into the document.
   * Returns `true` if the document was replaced (initial mount or thread switch), `false`
   * if the call was a streaming append (or a no-op).
   */
  update(messages: Message.Message[]): boolean {
    if (messages[0]?.id !== this._threadId) {
      this.reset(messages);
      return true;
    }
    const buffer = this._walk(messages);
    if (buffer.length > 0) {
      void this._document.append(buffer);
    }
    return false;
  }

  /**
   * Walk flat blocks starting at `_completed`, advancing the cursors and returning the chars
   * to append. Blocks before `_completed` are skipped — their renderer is never re-invoked,
   * which preserves single-shot side effects (e.g. tool widget state mutation).
   */
  _walk(messages: Message.Message[]): string {
    let buffer = '';
    let index = 0;
    outer: for (const message of messages) {
      for (const block of message.blocks) {
        if (index < this._completed) {
          index++;
          continue;
        }
        const rendered = this._renderer(this._context, message, block) ?? '';
        if (rendered.length > this._trailing) {
          buffer += rendered.slice(this._trailing);
        }
        if (block.pending) {
          // Stay on this block; record how far we've appended so the next call can resume.
          // `Math.max`-style guard against a non-monotonic renderer output without shrinking the doc.
          if (rendered.length > this._trailing) {
            this._trailing = rendered.length;
          }
          break outer;
        }
        this._completed = index + 1;
        this._trailing = 0;
        index++;
      }
    }
    return buffer;
  }
}
