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
 * Thread context passed to renderer.
 */
export class MessageThreadContext implements Pick<MarkdownStreamController, 'updateWidget'> {
  constructor(private readonly _widgetState?: XmlWidgetStateManager) {}

  updateWidget<T>(id: string, value: StateDispatch<T>) {
    this._widgetState?.updateWidget(id, value);
  }

  // TODO(burdon): Resolve from hypergraph.
  getObjectLabel(_id: DXN) {
    return 'Object';
  }
}

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
 * Syncs messages with the editor.
 *
 * Reflects the AI streaming contract:
 * - Messages and their blocks are appended in order.
 * - Only the last block in `messages` may be `pending`; all earlier blocks are finalized.
 * - The renderer's output for a streaming block grows monotonically (see {@link BlockRenderer}).
 * - The document is read-only outside this syncer.
 *
 * Under those rules the syncer needs only:
 * - `#completed`: the flat-block index past which everything has been fully appended.
 * - `#trailing`: chars of the in-flight block (at index `#completed`) already appended.
 * - `#threadId`: identity sentinel; if `messages[0]?.id` changes, the document is replaced.
 */
export class MessageSyncer {
  #threadId?: string;
  #completed = 0;
  #trailing = 0;

  readonly #context: MessageThreadContext;

  constructor(
    private readonly _document: TextModel,
    private readonly _renderer: BlockRenderer,
  ) {
    this.#context = new MessageThreadContext(this._document);
  }

  get context() {
    return this.#context;
  }

  /**
   * Replace the document with the rendering of `messages`. Use on mount, on thread switch,
   * and from {@link update} when it detects an identity change in `messages[0]`.
   */
  reset(messages: Message.Message[] = []): void {
    this.#threadId = messages[0]?.id;
    this.#completed = 0;
    this.#trailing = 0;
    const buffer = this.#walk(messages);
    void this._document.setContent(buffer).then(() => {
      rehydrateToolWidgetsFromMessages(this.#context, messages);
    });
  }

  /**
   * Stream the suffix of the rendered messages into the document.
   * Returns `true` if the document was replaced (initial mount or thread switch), `false`
   * if the call was a streaming append (or a no-op).
   */
  update(messages: Message.Message[]): boolean {
    if (messages[0]?.id !== this.#threadId) {
      this.reset(messages);
      return true;
    }
    const buffer = this.#walk(messages);
    if (buffer.length > 0) {
      void this._document.append(buffer);
    }
    return false;
  }

  /**
   * Walk flat blocks starting at `#completed`, advancing the cursors and returning the chars
   * to append. Blocks before `#completed` are skipped — their renderer is never re-invoked,
   * which preserves single-shot side effects (e.g. tool widget state mutation).
   */
  #walk(messages: Message.Message[]): string {
    let buffer = '';
    let index = 0;
    outer: for (const message of messages) {
      for (const block of message.blocks) {
        if (index < this.#completed) {
          index++;
          continue;
        }
        const rendered = this._renderer(this.#context, message, block) ?? '';
        if (rendered.length > this.#trailing) {
          buffer += rendered.slice(this.#trailing);
        }
        if (block.pending) {
          // Stay on this block; record how far we've appended so the next call can resume.
          // `Math.max`-style guard against a non-monotonic renderer output without shrinking the doc.
          if (rendered.length > this.#trailing) {
            this.#trailing = rendered.length;
          }
          break outer;
        }
        this.#completed = index + 1;
        this.#trailing = 0;
        index++;
      }
    }
    return buffer;
  }
}
