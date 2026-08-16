//
// Copyright 2026 DXOS.org
//

import { type ContentBlock, type Message } from '@dxos/types';

/**
 * What an item renders. The engine is renderer-agnostic: a message may resolve to a markdown
 * document, to raw HTML (email bodies, which are not markdown and cannot be a CodeMirror document),
 * or to a caller-supplied component.
 */
export type ItemContent =
  | { kind: 'markdown'; text: string }
  | { kind: 'html'; html: string }
  | { kind: 'custom'; key: string; data?: unknown };

/** Resolves a message to the content its item renders. One per scenario (chat, email, …). */
export type MessageRenderer = (message: Message.Message) => ItemContent;

/**
 * Default renderer: an `text/html` block wins (email), otherwise every block is flattened to
 * markdown. Block kinds the engine does not know become fenced JSON so nothing renders as blank.
 */
export const defaultRenderer: MessageRenderer = (message) => {
  const textBlocks = message.blocks.filter((block): block is ContentBlock.Text => block._tag === 'text');
  const html = textBlocks.find((block) => block.mimeType === 'text/html');
  if (html) {
    return { kind: 'html', html: html.text };
  }

  return { kind: 'markdown', text: message.blocks.map(blockToMarkdown).filter(Boolean).join('\n\n') };
};

const blockToMarkdown = (block: ContentBlock.Any): string => {
  switch (block._tag) {
    case 'text':
      return block.text;
    case 'reasoning':
      return `<reasoning>${block.reasoningText ?? block.redactedText ?? ''}</reasoning>`;
    case 'status':
      return `<status>${block.statusText}</status>`;
    case 'summary':
      return `<summary>${block.content}</summary>`;
    case 'suggestion':
      return `<suggestion>${block.text}</suggestion>`;
    case 'toolCall':
      return `<toolCall id="${block.toolCallId}" />`;
    default:
      return '';
  }
};

/** Plain text of a message, used by search and copy so both read the same projection. */
export const messageText = (message: Message.Message, renderer: MessageRenderer): string => {
  const content = renderer(message);
  switch (content.kind) {
    case 'markdown':
      return content.text;
    case 'html':
      return stripHtml(content.html);
    case 'custom':
      return '';
  }
};

/** Crude tag strip — the engine only needs searchable/copyable text, not a parse tree. */
const stripHtml = (html: string): string =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

//
// Search
//

export type SearchHit = {
  messageId: string;
  /** Index into the message list, so the virtualizer can scroll to it without a second lookup. */
  index: number;
  /** Offset into the message's rendered text. */
  offset: number;
  length: number;
};

/**
 * Search the model rather than the DOM.
 *
 * Virtualization means most messages are not mounted, and a `viewType` filter can hide blocks that
 * are still in the model — neither is reachable by a per-view CodeMirror search, so thread-wide find
 * has to run over the projection.
 */
export const searchFeed = (
  messages: readonly Message.Message[],
  renderer: MessageRenderer,
  query: string,
): SearchHit[] => {
  const hits: SearchHit[] = [];
  if (!query.length) {
    return hits;
  }

  const needle = query.toLowerCase();
  messages.forEach((message, index) => {
    const text = messageText(message, renderer).toLowerCase();
    let offset = text.indexOf(needle);
    while (offset !== -1) {
      hits.push({ messageId: message.id, index, offset, length: query.length });
      offset = text.indexOf(needle, offset + needle.length);
    }
  });

  return hits;
};

//
// Selection
//

/** A point in the feed: a message plus an offset into its rendered text. */
export type FeedAnchor = { messageId: string; offset: number };

export type FeedRange = { from: FeedAnchor; to: FeedAnchor };

/**
 * Text between two anchors, spanning message boundaries.
 *
 * Native selection cannot span separate editor instances, and unmounted messages are not in the DOM
 * at all, so cross-message copy is reconstructed from the model.
 */
export const sliceFeed = (
  messages: readonly Message.Message[],
  renderer: MessageRenderer,
  range: FeedRange,
): string => {
  const fromIndex = messages.findIndex((message) => message.id === range.from.messageId);
  const toIndex = messages.findIndex((message) => message.id === range.to.messageId);
  if (fromIndex === -1 || toIndex === -1) {
    return '';
  }

  // Normalize so a backwards drag (focus before anchor) yields the same text as a forwards one.
  const [start, end] =
    fromIndex < toIndex || (fromIndex === toIndex && range.from.offset <= range.to.offset)
      ? [range.from, range.to]
      : [range.to, range.from];
  const [startIndex, endIndex] = fromIndex < toIndex ? [fromIndex, toIndex] : [toIndex, fromIndex];

  const parts: string[] = [];
  for (let index = startIndex; index <= endIndex; index++) {
    const text = messageText(messages[index], renderer);
    const from = index === startIndex ? start.offset : 0;
    const to = index === endIndex ? end.offset : text.length;
    parts.push(text.slice(from, to));
  }

  return parts.join('\n\n');
};
