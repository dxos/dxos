import { Model } from '@dxos/data-client';

/**
 * Partially ordered model accepts messages in a sequence of messageId and previousMessageId, allowing non-unique previousMessageIds
 */
export class PartiallyOrderedModel extends Model {
  _messageQueue = [];

  _orderedMessages = [];

  _seenIds = new Set([0]);
  _maxSeenId = 0;

  get orderedMessages () {
    return this._orderedMessages;
  }

  async processMessages (messages) {
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
      const nextMessageCandidates = this._messageQueue
        .filter(m => this._seenIds.has(m.previousMessageId))
        .sort((a, b) => this.compareCandidates(a, b));

      if (nextMessageCandidates.length === 0) {
        break; // no messages from the queue could be applied at this time
      }

      this._orderedMessages = [...this._orderedMessages, ...nextMessageCandidates];
      toApply.push(...nextMessageCandidates);

      // ...and discards the rest
      this._messageQueue = this._messageQueue.filter(m => !this._seenIds.has(m.previousMessageId));

      nextMessageCandidates.forEach(m => this._seenIds.add(m.messageId));
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
  compareCandidates(a, b) {
    return -1;
  }

  // eslint-disable-next-line
  async onUpdate(messages) {
    throw new Error(`Not processed: ${messages.length}`);
  }

  static createGenesisMessage (message) {
    return {
      ...message,
      messageId: 1,
      previousMessageId: 0
    };
  }

  appendMessage (message) {
    super.appendMessage({
      ...message,
      messageId: this._maxSeenId + 1,
      previousMessageId: this._maxSeenId
    });
  }
}

export class DefaultPartiallyOrderedModel extends PartiallyOrderedModel {
  get messages () {
    return this._orderedMessages;
  }

  onUpdate () {

  }
}
