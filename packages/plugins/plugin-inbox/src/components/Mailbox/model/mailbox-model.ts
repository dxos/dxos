//
// Copyright 2025 DXOS.org
//

import { computed, signal, type Signal, type ReadonlySignal } from '@preact/signals-core';

import { type MessageType } from '@dxos/schema';
import { distinctBy } from '@dxos/util';

/**
 * Sort direction for messages.
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Tag structure within a message
 */
export type Tag = { label: string; hue: string };

/**
 * Sort by date comparison function.
 * @param direction The direction to sort (1 for ascending, -1 for descending).
 */
const byDate =
  (direction = -1) =>
  ({ created: a = '' }: MessageType, { created: b = '' }: MessageType) =>
    a < b ? -direction : a > b ? direction : 0;

/**
 * Creates a map of tag labels to arrays of messages containing that tag.
 * @param messages - Array of messages to process.
 */
const makeTagToMessageIndex = (messages: MessageType[]): Map<string, MessageType[]> => {
  const tagToMessagesMap = new Map<string, MessageType[]>();

  for (const message of messages) {
    const messageTags = message.properties?.tags || [];
    for (const tag of messageTags) {
      const tagLabel = tag.label;
      if (!tagToMessagesMap.has(tagLabel)) {
        tagToMessagesMap.set(tagLabel, []);
      }
      tagToMessagesMap.get(tagLabel)!.push(message);
    }
  }

  return tagToMessagesMap;
};

/**
 * Creates a map of tag labels to Tag objects.
 * @param messages - Array of messages to process.
 */
const makeTagIndex = (messages: MessageType[]): Map<string, Tag> => {
  const tagIndex = new Map<string, Tag>();

  for (const message of messages) {
    const messageTags = message.properties?.tags || [];
    for (const tag of messageTags) {
      if (!tagIndex.has(tag.label)) {
        tagIndex.set(tag.label, tag);
      }
    }
  }

  return tagIndex;
};

/**
 * Model representing a mailbox with messages.
 */
export class MailboxModel {
  // Primary signals (direct inputs).
  private _messages: Signal<MessageType[]>;
  private _sortDirection: Signal<SortDirection>;
  private _selectedTags: Signal<Tag[]>;

  // Computed signals (derived state).
  private _tagToMessagesIndex: ReadonlySignal<Map<string, MessageType[]>>;
  private _tagIndex: ReadonlySignal<Map<string, Tag>>;
  private _filteredMessages: ReadonlySignal<MessageType[]>;
  private _sortedFilteredMessages: ReadonlySignal<MessageType[]>;

  /**
   * Creates a new instance of MailboxModel.
   * @param messages - Initial list of messages from the queue (optional).
   * @param sortDirection - Direction to sort (optional).
   */
  constructor(messages: MessageType[] = [], sortDirection: SortDirection = 'desc') {
    // Initialize primary signals
    this._messages = signal(messages);
    this._sortDirection = signal(sortDirection);
    this._selectedTags = signal([]);

    this._tagToMessagesIndex = computed(() => makeTagToMessageIndex(this._messages.value));
    this._tagIndex = computed(() => makeTagIndex(this._messages.value));

    this._filteredMessages = computed(() => {
      const selectedTags = this._selectedTags.value;
      const tagToMessagesIndex = this._tagToMessagesIndex.value;

      if (selectedTags.length === 0) {
        return this._messages.value;
      }

      const messages = selectedTags.map((t) => t.label).flatMap((label) => tagToMessagesIndex.get(label) ?? []);
      return distinctBy(messages, (message) => message.id);
    });

    this._sortedFilteredMessages = computed(() => {
      const directionValue = this._sortDirection.value === 'asc' ? 1 : -1;
      return [...this._filteredMessages.value].sort(byDate(directionValue));
    });
  }

  /**
   * Gets the current list of messages in the mailbox, filtered and sorted.
   */
  get messages(): MessageType[] {
    return this._sortedFilteredMessages.value;
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

  /**
   * Gets the currently selected tags.
   */
  get selectedTags(): Tag[] {
    return this._selectedTags.value;
  }

  /**
   * Selects a tag for filtering if it's not already selected.
   * @param tag - The tag to select.
   */
  selectTag(tag: Tag): void {
    const currentTags = this._selectedTags.value;
    if (!currentTags.some((t) => t.label === tag.label)) {
      this._selectedTags.value = [...currentTags, tag];
    }
  }

  /**
   * Deselects a tag, removing it from the filter criteria.
   * @param tagLabel - The label of the tag to deselect.
   */
  deselectTag(tagLabel: string): void {
    this._selectedTags.value = this._selectedTags.value.filter((tag) => tag.label !== tagLabel);
  }

  /**
   * Clears all selected tags, effectively showing all messages.
   */
  clearSelectedTags(): void {
    this._selectedTags.value = [];
  }

  /**
   * Gets all unique tags present across all messages.
   */
  get availableTags(): Tag[] {
    return Array.from(this._tagIndex.value.values());
  }

  /**
   * Gets the count of messages with a specific tag.
   * @param tagLabel - The label of the tag to count messages for.
   */
  getMessageCountForTag(tagLabel: string): number {
    return this._tagToMessagesIndex.value.get(tagLabel)?.length || 0;
  }
}
