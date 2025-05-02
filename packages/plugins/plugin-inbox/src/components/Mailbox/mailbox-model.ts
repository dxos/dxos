//
// Copyright 2025 DXOS.org
//

import { computed, signal, type Signal, type ReadonlySignal } from '@preact/signals-core';

import { type MessageType } from '@dxos/schema';

/**
 * Sort direction for messages.
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Sort by date comparison function.
 * @param direction The direction to sort (1 for ascending, -1 for descending).
 */
const byDate =
  (direction = -1) =>
  ({ created: a = '' }: MessageType, { created: b = '' }: MessageType) =>
    a < b ? -direction : a > b ? direction : 0;

/**
 * Model representing a mailbox with messages from a queue.
 */
export class MailboxModel {
  // Signal for raw messages
  private _messages: Signal<MessageType[]>;

  // Signal for sort direction
  private _sortDirection: Signal<SortDirection>;

  // Computed signal for sorted messages
  private _sortedMessages: ReadonlySignal<MessageType[]>;

  /**
   * Creates a new instance of MailboxModel.
   * @param messages - Initial list of messages from the queue (optional).
   * @param sortDirection - Direction to sort (optional).
   */
  constructor(messages: MessageType[] = [], sortDirection: SortDirection = 'desc') {
    this._messages = signal(messages);
    this._sortDirection = signal(sortDirection);

    // Compute sorted messages based on messages and sort direction
    this._sortedMessages = computed(() => {
      const directionValue = this._sortDirection.value === 'asc' ? 1 : -1;
      return [...this._messages.value].sort(byDate(directionValue));
    });
  }

  /**
   * Gets the current list of messages in the mailbox, sorted by creation date.
   */
  get messages(): MessageType[] {
    return this._sortedMessages.value;
  }

  /**
   * Sets the list of messages in the mailbox.
   * @param messages - New list of messages from the queue.
   */
  set messages(messages: MessageType[]) {
    this._messages.value = messages;
  }

  /**
   * Gets the current sort direction.
   */
  get sortDirection(): SortDirection {
    return this._sortDirection.value;
  }

  /**
   * Sets the sort direction.
   * @param direction - Direction to sort ('asc' or 'desc').
   */
  set sortDirection(direction: SortDirection) {
    this._sortDirection.value = direction;
  }
}
