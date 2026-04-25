//
// Copyright 2025 DXOS.org
//

import { type DXN } from '@dxos/echo';
import { log } from '@dxos/log';
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
 */
export type BlockRenderer = (
  context: MessageThreadContext,
  message: Message.Message,
  block: ContentBlock.Any,
) => string | undefined;

/**
 * Syncs messages with the editor.
 */
export class MessageSyncer {
  #syncEpoch = 0;
  private _initialMessageId?: string;
  private _currentMessageIndex = 0;
  private _currentBlockIndex = 0;
  private _currentBlockContent?: string;
  /**
   * Set by `processBlocks` when a streaming block's renderer output stops being a
   * prefix-extension of the previously-emitted content (e.g. an upstream normalisation collapses
   * a line). The incremental append path can no longer produce a correct delta, so the caller
   * resets the syncer and rebuilds the whole document via the buffer/`setContent` path.
   */
  private _needsRebuild = false;

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

  reset() {
    log('reset');
    this.#resetState();
    void this._document.setContent('');
  }

  /**
   * Clears in-memory sync cursors without touching the document. Used by the internal rebuild
   * path (which immediately re-dispatches content via `#fullRebuild`) and by `reset()` (which
   * also clears the document). Kept private so callers cannot forget to match a state reset
   * with a document update.
   */
  #resetState() {
    this.#syncEpoch++;
    this._initialMessageId = undefined;
    this._currentMessageIndex = 0;
    this._currentBlockIndex = 0;
    this._currentBlockContent = undefined;
    this._needsRebuild = false;
  }

  /**
   * Syncs messages with the editor.
   */
  append(messages: Message.Message[], flush = false): boolean {
    // Check if new set of messages.
    if (this._initialMessageId !== messages[0]?.id) {
      this.reset();
      this._initialMessageId = messages[0]?.id;
    }

    if (this._document.length === 0 && flush) {
      return this.#fullRebuild(messages);
    }

    this._needsRebuild = false;
    this.processBlocks(messages, (content) => {
      void this._document.append(content);
    });

    if (this._needsRebuild) {
      // A streaming block's render diverged from the previously-emitted content; the incremental
      // append path cannot recover (it would duplicate the opening of the block in the document).
      // Reset and rebuild from scratch via the `setContent` path so the document matches `messages`.
      // Use `#resetState` (not `reset()`) to avoid dispatching an extra `setContent('')` that
      // `#fullRebuild` would immediately overwrite.
      log.warn('non-monotonic streaming render detected; rebuilding chat thread document');
      this.#resetState();
      this._initialMessageId = messages[0]?.id;
      return this.#fullRebuild(messages);
    }

    return false;
  }

  /**
   * Render every block into a fresh buffer and hand the result to `setContent`, then rehydrate
   * tool widget state once the dispatch settles.
   */
  #fullRebuild(messages: Message.Message[]): boolean {
    const buffer: string[] = [];
    this.processBlocks(messages, (content) => buffer.push(content));
    const content = buffer.join('');
    // `setContent` dispatches `xmlTagResetEffect`, which clears widget props accumulated during
    // `processBlocks`; re-apply tool state after the document is replaced.
    const epoch = this.#syncEpoch;
    void this._document
      .setContent(content)
      .then(() => {
        if (epoch !== this.#syncEpoch) {
          return;
        }
        rehydrateToolWidgetsFromMessages(this._context, messages);
      })
      .catch((error) => {
        // `processBlocks` advanced the sync cursors for `messages`; if the document dispatch
        // rejected, those cursors no longer match the document state, so any subsequent
        // incremental append would emit incorrect deltas. Clear cursor state (while leaving the
        // document as-is for the controller to recover) and force the next `append` to start
        // from scratch.
        log.warn('failed to replace thread content; resetting syncer state for next append', { error });
        this.#resetState();
      });

    return true;
  }

  private processBlocks(messages: Message.Message[], append: (content: string) => void) {
    let i = this._currentMessageIndex;
    for (const message of messages.slice(this._currentMessageIndex)) {
      if (i > this._currentMessageIndex) {
        this._currentBlockIndex = 0;
      }

      this._currentMessageIndex = i;
      let j = this._currentBlockIndex;
      for (const block of message.blocks.slice(this._currentBlockIndex)) {
        this._currentBlockIndex = j;
        const currentBlockContent = this._renderer(this._context, message, block);
        if (currentBlockContent) {
          if (this._currentBlockContent !== undefined && !currentBlockContent.startsWith(this._currentBlockContent)) {
            // The renderer's output for a streaming block must be a prefix-extension of the
            // previously-emitted content; otherwise the incremental append path cannot recover.
            // Signal the caller to fall back to a full rebuild and bail out.
            this._needsRebuild = true;
            return;
          }

          const delta =
            this._currentBlockContent !== undefined
              ? currentBlockContent.slice(this._currentBlockContent.length)
              : currentBlockContent;
          this._currentBlockContent = currentBlockContent;
          append(delta);
        }

        if (block.pending) {
          return;
        } else {
          this._currentBlockContent = undefined;
          this._currentBlockIndex++;
        }
        j++;
      }
      i++;
    }
  }
}
