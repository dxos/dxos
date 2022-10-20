//
// Copyright 2020 DXOS.org
//

import { ModelMeta, Model, StateMachine, MutationProcessMeta } from '@dxos/model-factory';
import { schema } from '@dxos/protocols';
import { Message } from '@dxos/protocols/proto/dxos/echo/model/messenger';

class MessengerModelStateMachine implements StateMachine<Message[], Message, {}> {
  private readonly _messages: Message[] = [];

  getState (): Message[] {
    return this._messages;
  }

  process (mutation: Message, meta: MutationProcessMeta): void {
    this._messages.push(mutation);
    this._messages.sort((msgA, msgB) => parseInt(msgA.timestamp) - parseInt(msgB.timestamp));
  }

  snapshot (): {} {
    throw new Error('Method not implemented.');
  }

  reset (snapshot: {}): void {
    throw new Error('Method not implemented.');
  }
}

/**
 * MessengerModel is a simple model which represents a chat as an array of Messages.
 */
export class MessengerModel extends Model<Message[], Message> {
  static meta: ModelMeta = {
    type: 'dxos:model/messenger',
    stateMachine: () => new MessengerModelStateMachine(),
    mutationCodec: schema.getCodecForType('dxos.echo.model.messenger.Message')
  };

  get messages (): Message[] {
    return this._getState();
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
