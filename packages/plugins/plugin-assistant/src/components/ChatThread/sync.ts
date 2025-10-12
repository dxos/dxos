//
// Copyright 2025 DXOS.org
//

import { log } from '@dxos/log';
import { type MarkdownStreamController } from '@dxos/react-ui-components';
import { type XmlWidgetStateManager } from '@dxos/react-ui-editor';
import { type ContentBlock, type DataType } from '@dxos/schema';

/**
 * Update document.
 */
export type TextModel = Pick<MarkdownStreamController, 'reset' | 'append' | 'updateWidget'>;

/**
 * Thread context passed to renderer.
 */
export class MessageThreadContext implements Pick<MarkdownStreamController, 'updateWidget'> {
  constructor(private readonly _widgetState?: XmlWidgetStateManager) {}

  updateWidget<T>(id: string, value: T) {
    this._widgetState?.updateWidget(id, value);
  }
}

/**
 * Renders a block to markdown.
 */
export type BlockRenderer = (
  context: MessageThreadContext,
  message: DataType.Message,
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
    private readonly _model: TextModel,
    private readonly _blockRenderer: BlockRenderer,
  ) {
    this._context = new MessageThreadContext(this._model);
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
    void this._model.reset('');
  }

  sync(messages: DataType.Message[]) {
    log('sync', {
      messages: messages.map((message) => message.blocks.length),
      currentMessageIndex: this._currentMessageIndex,
      currentBlockIndex: this._currentBlockIndex,
      currentBlockContent: this._currentBlockContent,
    });
    if (this._initialMessageId !== messages[0]?.id) {
      this.reset();
      this._initialMessageId = messages[0]?.id;
    }

    let i = this._currentMessageIndex;
    for (const message of messages.slice(this._currentMessageIndex)) {
      if (i > this._currentMessageIndex) {
        this._currentBlockIndex = 0;
      }

      this._currentMessageIndex = i;
      let j = this._currentBlockIndex;
      for (const block of message.blocks.slice(this._currentBlockIndex)) {
        this._currentBlockIndex = j;
        const currentBlockContent = this._blockRenderer(this._context, message, block);
        if (currentBlockContent) {
          let content: string = '';
          if (this._currentBlockContent && currentBlockContent.startsWith(this._currentBlockContent)) {
            content = currentBlockContent.slice(this._currentBlockContent.length);
          } else {
            content = currentBlockContent;
          }

          void this._model.append(content);
          this._currentBlockContent = currentBlockContent;
          log('append', { message: i, block: j, content });
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
