//
// Copyright 2025 DXOS.org
//

import { type DXN } from '@dxos/echo';
import { log } from '@dxos/log';
import { type MarkdownStreamController } from '@dxos/react-ui-components';
import { type StateDispatch, type XmlWidgetStateManager } from '@dxos/react-ui-editor';
import { DataType } from '@dxos/schema';

import ContentBlock = DataType.ContentBlock;

/**
 * Update document.
 */
export type TextModel = Pick<MarkdownStreamController, 'view' | 'reset' | 'append' | 'updateWidget'>;

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
  message: DataType.Message.Message,
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

  /**
   * Syncs messages with the editor.
   */
  append(messages: DataType.Message.Message[], flush = false): boolean {
    // Check if new set of messages.
    if (this._initialMessageId !== messages[0]?.id) {
      this.reset();
      this._initialMessageId = messages[0]?.id;
    }

    if (flush && this._model.view?.state.doc.length === 0) {
      const buffer: string[] = [];
      this.process(messages, (content) => {
        buffer.push(content);
      });

      const content = buffer.join('');
      this._model.view?.dispatch({
        changes: [{ from: 0, to: this._model.view?.state.doc.length ?? 0, insert: content }],
        selection: { anchor: content.length },
      });

      return true;
    } else {
      this.process(messages, (content) => {
        void this._model.append(content);
      });

      return false;
    }
  }

  private process(messages: DataType.Message.Message[], append: (content: string) => void) {
    log('sync', {
      doc: this._model.view?.state.doc.length,
      messages: messages.map((message) => message.blocks.length),
      currentMessageIndex: this._currentMessageIndex,
      currentBlockIndex: this._currentBlockIndex,
      currentBlockContent: this._currentBlockContent,
    });

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

          log('append', { message: i, block: j, content });
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
