//
// Copyright 2025 DXOS.org
//

import { log } from '@dxos/log';
import { type DataType } from '@dxos/schema';

import { blockToMarkdown } from './registry';

// TODO(burdon): Extend syncer interface.
export type TextModel = {
  update: (text: string) => Promise<void>;
  append: (text: string) => Promise<void>;
};

// TODO(burdon): Pass in blockToMarkdown.

/**
 * Syncs messages with the editor.
 */
// TODO(burdon): Factor out.
export class MessageSyncer {
  private _initialMessageId?: string;
  private _currentMessageIndex = 0;
  private _currentBlockIndex = 0;
  private _currentBlockContent?: string;

  constructor(private readonly _doc: TextModel) {}

  reset() {
    log('reset');
    this._initialMessageId = undefined;
    this._currentMessageIndex = 0;
    this._currentBlockIndex = 0;
    this._currentBlockContent = undefined;
    void this._doc.update('');
  }

  sync(messages: DataType.Message[]) {
    log('sync', {
      messages: messages.map((m) => m.blocks.length),
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
        const currentBlockContent = blockToMarkdown(message, block);
        if (currentBlockContent) {
          let content: string = '';
          if (this._currentBlockContent && currentBlockContent.startsWith(this._currentBlockContent)) {
            content = currentBlockContent.slice(this._currentBlockContent.length);
          } else {
            content = currentBlockContent;
          }

          void this._doc.append(content);
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
