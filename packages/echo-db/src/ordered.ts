//
// Copyright 2020 DxOS.org
//

// TODO(burdon): Remove dependency (via adapter). Or move to other package.
import { Model } from '@dxos/data-client';
import {OrderedMessage} from './common/OrderedMessage'

/**
 * Basic ordered log model. Maintains a list of messages in an order of referencing messages to a previous ones.
 * It requires the previousMessageId of the first message (genesis) to be equal '0'
 * It requires every message to have id, and every message (except genesis) to have previousMessageId referencing an existing message's id
 */
export class OrderedModel<T extends OrderedMessage> extends Model {
  _messageQueue: T[] = [];

  _orderedMessages: T[] = [];

  get orderedMessages () {
    return this._orderedMessages;
  }

  async processMessages (messages: T[]) {
    const messagesWithOrdering = messages
      .filter(
        m => m.messageId !== null && m.messageId !== undefined &&
        m.previousMessageId !== null && m.previousMessageId !== undefined
      );

    this._messageQueue.push(...messagesWithOrdering);
    this.tryApplyQueue();
    this.emit('update', this);
  }

  async tryApplyQueue () {
    const toApply = [];
    while (this._messageQueue.length > 0) {
      const currentMessageId = this._orderedMessages.length === 0 ? 0
        : this._orderedMessages[this._orderedMessages.length - 1].messageId;

      const nextMessageCandidates = this._messageQueue
        .filter(m => m.previousMessageId === currentMessageId)
        .filter(m => !this._orderedMessages.find(o => o.messageId === m.messageId)) // make sure message id does not already exist
        .filter(m => this.validateCandidate(this._orderedMessages.length, m)); // apply (optional) strategy

      if (nextMessageCandidates.length === 0) {
        break; // no messages from the queue could be applied at this time
      }

      // the default model picks any candidate...
      const nextMessage = nextMessageCandidates[0];
      this._orderedMessages = [...this._orderedMessages, nextMessage];
      toApply.push(nextMessage);

      // ...and discards the rest
      this._messageQueue = this._messageQueue.filter(m => m.previousMessageId !== currentMessageId);
    }
    await this.onUpdate(toApply);
  }

  /**
   * @Virtual
   * When overriding this model, it can be used to apply a custom strategy (e.g. permissions to write messages)
   * @param  {integer} intendedPosition - 0-indexed position of ordered messages, that the candidate is about to get
   * @param  {object} message - message candidate
   */
  // eslint-disable-next-line
  validateCandidate(_intendedPosition: number, _message: T) {
    return true;
  }

  // eslint-disable-next-line
  async onUpdate(messages: T[]) {
    throw new Error(`Not processed: ${messages.length}`);
  }

  static createGenesisMessage (message: any) {
    return {
      messageId: 1,
      previousMessageId: 0,
      ...message
    };
  }

  appendMessage (message: Omit<T, 'messageId' | 'previousMessageId'>) {
    super.appendMessage({
      messageId: this._orderedMessages.length + 1, // first message has id of 1
      previousMessageId: this._orderedMessages.length > 0
        ? this._orderedMessages[this._orderedMessages.length - 1].messageId
        : 0,
      ...message
    });
  }
}

export class DefaultOrderedModel<T extends OrderedMessage> extends OrderedModel<T> {
  get messages () {
    return this._orderedMessages;
  }

  async onUpdate () {

  }
}
