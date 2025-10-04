//
// Copyright 2025 DXOS.org
//

import { type ReadonlySignal, type Signal, computed, signal } from '@preact/signals-core';

import { type DataType } from '@dxos/schema';
import { intersectBy } from '@dxos/util';

import { getMessageTextMatch } from '../../util';

/**
 * Sort direction for messages.
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Tag structure within a message
 */
// TODO(ZaymonFC): Switch to generalized object tag pattern when that's available.
export type Tag = {
  label: string;
  hue: string;
};

export const sortTags = ({ label: a }: Tag, { label: b }: Tag) => a.localeCompare(b);

/**
 * Sort by date comparison function.
 * @param direction The direction to sort (1 for ascending, -1 for descending).
 */
export const sortMessagesByDate =
  (direction = -1) =>
  ({ created: a = '' }: DataType.Message, { created: b = '' }: DataType.Message) =>
    a < b ? -direction : a > b ? direction : 0;

/**
 * Creates a map of tag labels to arrays of messages containing that tag.
 * @param messages - Array of messages to process.
 */
const createTagToMessageIndex = (messages: DataType.Message[]): Map<string, DataType.Message[]> => {
  const tagToMessagesMap = new Map<string, DataType.Message[]>();
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
const createTagIndex = (messages: DataType.Message[]): Map<string, Tag> => {
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
  private _messages: Signal<DataType.Message[]>;
  private _sortDirection: Signal<SortDirection>;
  private _selectedTagLabels: Signal<string[]>;
  private _selectedTextFilters: Signal<string[]>;

  // Computed signals (derived state).
  private _tagToMessagesIndex: ReadonlySignal<Map<string, DataType.Message[]>>;
  private _tagIndex: ReadonlySignal<Map<string, Tag>>;
  private _filteredMessages: ReadonlySignal<DataType.Message[]>;
  private _sortedFilteredMessages: ReadonlySignal<DataType.Message[]>;

  /**
   * Creates a new instance of MailboxModel.
   * @param messages - Initial list of messages from the queue (optional).
   * @param sortDirection - Direction to sort (optional).
   */
  constructor(messages: DataType.Message[] = [], sortDirection: SortDirection = 'desc') {
    // Initialize primary signals
    this._messages = signal(messages);
    this._sortDirection = signal(sortDirection);
    this._selectedTagLabels = signal([]);
    this._selectedTextFilters = signal([]);

    this._tagIndex = computed(() => createTagIndex(this._messages.value));
    this._tagToMessagesIndex = computed(() => createTagToMessageIndex(this._messages.value));

    this._filteredMessages = computed(() => {
      const selectedTagLabels = this._selectedTagLabels.value;
      const selectedTextFilters = this._selectedTextFilters.value;

      // If no filters are applied, return all messages
      if (selectedTagLabels.length === 0 && selectedTextFilters.length === 0) {
        return this._messages.value;
      }

      let filteredMessages = this._messages.value;

      // Apply tag filtering
      if (selectedTagLabels.length > 0) {
        const tagToMessagesIndex = this._tagToMessagesIndex.value;
        const messagesForSelectedTags = selectedTagLabels.map((label) => tagToMessagesIndex.get(label) ?? []);
        filteredMessages = intersectBy(messagesForSelectedTags, (message) => message.id);
      }

      // Apply text filtering - messages must contain ALL selected text filters
      if (selectedTextFilters.length > 0) {
        filteredMessages = filteredMessages.filter((message) => {
          return getMessageTextMatch(message, selectedTextFilters);
        });
      }

      return filteredMessages;
    });

    this._sortedFilteredMessages = computed(() => {
      const directionValue = this._sortDirection.value === 'asc' ? 1 : -1;
      return [...this._filteredMessages.value].sort(sortMessagesByDate(directionValue));
    });
  }

  //
  // Getters
  //

  /**
   * Gets the current list of messages in the mailbox, filtered and sorted.
   */
  get messages(): DataType.Message[] {
    return this._sortedFilteredMessages.value;
  }

  /**
   * Gets the current sort direction.
   */
  get sortDirection(): SortDirection {
    return this._sortDirection.value;
  }

  /**
   * Gets the currently selected tags.
   */
  get selectedTags(): Tag[] {
    // Convert the stored labels back to Tag objects for backward compatibility
    const tagIndex = this._tagIndex.value;
    return this._selectedTagLabels.value
      .map((label) => tagIndex.get(label))
      .filter((tag): tag is Tag => tag !== undefined);
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

  //
  // Setters
  //

  /**
   * Sets the list of messages in the mailbox.
   * @param messages - New list of messages from the queue.
   */
  set messages(messages: DataType.Message[]) {
    this._messages.value = messages;
  }

  /**
   * Sets the sort direction.
   * @param direction - Direction to sort ('asc' or 'desc').
   */
  set sortDirection(direction: SortDirection) {
    this._sortDirection.value = direction;
  }

  //
  // Actions
  //

  /**
   * Selects a tag for filtering if it's not already selected.
   * @param tagLabel - The label of the tag to select.
   */
  selectTag(tagLabel: string): void {
    const currentLabels = this._selectedTagLabels.value;
    if (!currentLabels.includes(tagLabel)) {
      this._selectedTagLabels.value = [...currentLabels, tagLabel];
    }
  }

  /**
   * Deselects a tag, removing it from the filter criteria.
   * @param tagLabel - The label of the tag to deselect.
   */
  deselectTag(tagLabel: string): void {
    this._selectedTagLabels.value = this._selectedTagLabels.value.filter((label) => label !== tagLabel);
  }

  /**
   * Clears all selected tags, effectively showing all messages.
   */
  clearSelectedTags(): void {
    this._selectedTagLabels.value = [];
  }

  /**
   * Adds a text filter for message content filtering.
   * @param text - The text string to filter by.
   */
  addTextFilter(text: string): void {
    const currentFilters = this._selectedTextFilters.value;
    if (!currentFilters.includes(text)) {
      this._selectedTextFilters.value = [...currentFilters, text];
    }
  }

  /**
   * Removes a text filter from the filtering criteria.
   * @param text - The text string to remove from filters.
   */
  removeTextFilter(text: string): void {
    this._selectedTextFilters.value = this._selectedTextFilters.value.filter((filter) => filter !== text);
  }

  /**
   * Clears all text filters.
   */
  clearTextFilters(): void {
    this._selectedTextFilters.value = [];
  }

  /**
   * Gets the currently selected text filters.
   */
  get selectedTextFilters(): string[] {
    return this._selectedTextFilters.value;
  }

  /**
   * Sets the text filters directly, replacing any existing ones.
   * @param textFilters - Array of text strings to filter by.
   */
  setTextFilters(textFilters: string[]): void {
    this._selectedTextFilters.value = textFilters;
  }
}
