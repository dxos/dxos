//
// Copyright 2025 DXOS.org
//

import { type DXN } from '@dxos/echo';
import { log } from '@dxos/log';
import { type MarkdownStreamController } from '@dxos/react-ui-components';
import { type ContentBlock, type Message } from '@dxos/types';
import { type StateDispatch, type XmlWidgetStateManager } from '@dxos/ui-editor';

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
  private _initialMessageId?: string;
  private _currentMessageIndex = 0;
  private _currentBlockIndex = 0;
  private _currentBlockContent?: string;

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
    this._initialMessageId = undefined;
    this._currentMessageIndex = 0;
    this._currentBlockIndex = 0;
    this._currentBlockContent = undefined;
    void this._document.setContent('');
  }

  /**
   * Syncs messages with the editor.
   */
  append(messages: Message.Message[], flush = false): boolean {
    // TODO(dmaretskyi): MarkdownStream currently does not support streaming XML tags, so we need to remove pending non-text blocks.
    messages = messages.map((message) => ({
      ...message,
      blocks: message.blocks.filter((block) => !block.pending || block._tag === 'text'),
    }));

    // Check if new set of messages.
    if (this._initialMessageId !== messages[0]?.id) {
      this.reset();
      this._initialMessageId = messages[0]?.id;
    }

    if (this._document.length === 0 && flush) {
      const buffer: string[] = [];
      this.processBlocks(messages, (content) => buffer.push(content));
      const content = buffer.join('');
      void this._document.setContent(content);

      return true;
    } else {
      this.processBlocks(messages, (content) => {
        void this._document.append(content);
      });

      return false;
    }
  }

  private processBlocks(messages: Message.Message[], append: (content: string) => void) {
    // console.log('sync', {
    //   doc: this._model.view?.state.doc.length,
    //   messages: messages.map((message) => message.blocks.length),
    //   currentMessageIndex: this._currentMessageIndex,
    //   currentBlockIndex: this._currentBlockIndex,
    //   currentBlockContent: this._currentBlockContent,
    // });

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
          let content: string = '';
          if (this._currentBlockContent && currentBlockContent.startsWith(this._currentBlockContent)) {
            content = currentBlockContent.slice(this._currentBlockContent.length);
          } else {
            content = currentBlockContent;
          }

          // console.log('append', { message: i, block: j, content });
          this._currentBlockContent = currentBlockContent;
          append(content);
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
