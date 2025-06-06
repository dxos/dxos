//
// Copyright 2025 DXOS.org
//

import type { Message } from '../tools';
import type { GenerationStreamEvent } from '../types';

export class MessageCollector {
  private _messages: Message[] = [];
  private _pendingMessage?: Message = undefined;

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
          this._pendingMessage.content = this._pendingMessage.content || [];
          // Add the new content block at the specified index
          this._pendingMessage.content[event.index] = event.content;
        }
        break;

      case 'content_block_delta':
        if (this._pendingMessage && this._pendingMessage.content) {
          const block = this._pendingMessage.content[event.index];
          if (block && event.delta.type === 'text_delta' && block.type === 'text') {
            block.text = (block.text || '') + event.delta.text;
          }
        }
        break;

      case 'content_block_stop':
        // Mark the block as no longer pending if needed
        if (this._pendingMessage && this._pendingMessage.content) {
          const block = this._pendingMessage.content[event.index];
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

  pushMessage(message: Message): void {
    this._messages.push(message);
  }
}

export function* emitMessageAsEvents(message: Message): Iterable<GenerationStreamEvent> {
  yield {
    type: 'message_start',
    message,
  };
  yield {
    type: 'message_stop',
  };
}
