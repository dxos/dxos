//
// Copyright 2020 DXOS.org
//

import { MutationMeta } from '@dxos/echo-protocol';
import { ModelMeta, Model } from '@dxos/model-factory';

import { Message, schema } from './proto';

/**
 * MessengerModel is a simple model which represents a chat as an array of Messages.
 */
export class MessengerModel extends Model<Message> {
  static meta: ModelMeta = {
    type: 'dxos:model/messenger',
    mutation: schema.getCodecForType('dxos.model.messenger.Message')
  };

  private readonly _messages: Message[] = [];

  get messages () {
    return this._messages;
  }

  async _processMessage (meta: MutationMeta, message: Message) {
    this._messages.push(message);
    this._messages.sort((msgA, msgB) => parseInt(msgA.timestamp) - parseInt(msgB.timestamp));
    return true;
  }

  async sendMessage (message: Pick<Message, 'text' | 'sender'>) {
    const receipt = await this.write({
      text: message.text,
      timestamp: Date.now().toString(),
      sender: message.sender
    });
    await receipt.waitToBeProcessed();
  }
}
