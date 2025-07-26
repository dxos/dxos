//
// Copyright 2025 DXOS.org
//

import { type DataType } from '@dxos/schema';

import { type GenerationStreamEvent } from '../types';

export class MessageCollector {
  private _messages: DataType.Message[] = [];
  private _pendingMessage?: DataType.Message = undefined;

  public get messages() {
    return this._messages;
  }

  public get pendingMessage() {
    return this._pendingMessage;
  }

  push(event: GenerationStreamEvent): void {
    switch (event.type) {
      case 'message_start':
        this._pendingMessage = event.message;
        break;

      case 'message_stop':
        if (this._pendingMessage) {
          this._messages.push(this._pendingMessage);
          this._pendingMessage = undefined;
        }
        break;

      case 'content_block_start':
        if (this._pendingMessage) {
          // Ensure the content array exists
          this._pendingMessage.blocks = this._pendingMessage.blocks || [];
          // Add the new content block at the specified index
          this._pendingMessage.blocks[event.index] = event.content;
        }
        break;

      case 'content_block_delta':
        if (this._pendingMessage && this._pendingMessage.blocks) {
          const block = this._pendingMessage.blocks[event.index];
          if (block && event.delta.type === 'text_delta' && block._tag === 'text') {
            block.text = (block.text || '') + event.delta.text;
          }
        }
        break;

      case 'content_block_stop':
        // Mark the block as no longer pending if needed
        if (this._pendingMessage && this._pendingMessage.blocks) {
          const block = this._pendingMessage.blocks[event.index];
          if (block) {
            block.pending = false;
          }
        }
        break;

      case 'message_delta':
        // Apply any delta updates to the message
        if (this._pendingMessage && event.delta) {
          Object.assign(this._pendingMessage, event.delta);
        }
        break;
    }
  }

  pushMessage(message: DataType.Message): void {
    this._messages.push(message);
  }
}

export function* emitMessageAsEvents(message: DataType.Message): Iterable<GenerationStreamEvent> {
  yield {
    type: 'message_start',
    message,
  };
  yield {
    type: 'message_stop',
  };
}
