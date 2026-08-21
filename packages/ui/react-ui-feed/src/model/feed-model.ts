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
export const defaultRenderer: MessageRenderer = (message) => createContent(message, false);

/**
 * Assistant chat: as {@link defaultRenderer}, plus the reader's own turns marked with `<prompt>`.
 *
 * Separate because the tag is only meaningful where a widget registry knows it — a feed rendered
 * without one would show the reader their own angle brackets, which is what a human chat, a
 * transcript and a comment list all are.
 */
export const chatRenderer: MessageRenderer = (message) => createContent(message, true);

const createContent = (message: Message.Message, prompts: boolean): ItemContent => {
  const textBlocks = message.blocks.filter((block): block is ContentBlock.Text => block._tag === 'text');
  const html = textBlocks.find((block) => block.mimeType === 'text/html');
  if (html) {
    return { kind: 'html', html: html.text };
  }

  return {
    kind: 'markdown',
    text: message.blocks
      .map((block) => blockToMarkdown(message, block, prompts))
      .filter(Boolean)
      .join('\n\n'),
  };
};

/**
 * One block as markdown, with anything that is not prose emitted as an XML tag for a widget to
 * render. A message is the concatenation of these, which is what makes an item a document rather
 * than a component tree: the blocks are content, and the chrome around them belongs to the host.
 */
const blockToMarkdown = (message: Message.Message, block: ContentBlock.Any, prompts: boolean): string => {
  switch (block._tag) {
    case 'text':
      // A prompt is marked rather than styled: the reader's own words are content, and the widget
      // that frames them is the host's business.
      return prompts && message.sender.role === 'user' ? tag('prompt', block.text, block) : block.text.trim();
    case 'reasoning':
      return tag('reasoning', block.reasoningText ?? block.redactedText ?? '', block);
    case 'status':
      return tag('status', block.statusText, block);
    case 'summary':
      return tag('summary', block.content, block);
    case 'suggestion':
      return tag('suggestion', block.text, block);
    case 'select':
      return block.options.length
        ? `<select>${block.options.map((option) => `<option>${escapeXml(option)}</option>`).join('')}</select>`
        : '';
    case 'toolCall':
      // Name and status ride on the tag rather than in widget state kept beside the document: an
      // item is rebuilt from its message alone, so anything the widget needs has to survive there.
      return `<toolCall id="${escapeXml(block.toolCallId)}" name="${escapeXml(block.name)}"${block.pending ? ' pending="true"' : ''} />`;
    case 'toolResult':
      return tag('toolResult', String(block.result ?? block.error ?? ''), block, `for="${escapeXml(block.name)}"`);
    default:
      // Nothing renders blank: an unknown block is shown as what it is.
      return tag('json', JSON.stringify(block), block);
  }
};

/**
 * An XML tag holding block content.
 *
 * A pending block is emitted **unclosed**, which is the streaming contract: the item reconciles by
 * appending, so a closing tag written before the content is complete would have to be rewritten on
 * every chunk — and rewriting the document is what discards decorations and scroll position.
 *
 * Paragraph breaks inside the content are collapsed, since a blank line would end the enclosing
 * markdown block and leave the rest of the tag parsing as prose.
 */
const tag = (name: string, content: string, block: ContentBlock.Any, attributes?: string): string => {
  const text = escapeXml(content.replace(/\n\n+/g, ' ').trim());
  if (!text.length && !block.pending) {
    return '';
  }

  const open = `<${name}${attributes ? ` ${attributes}` : ''}>`;
  return block.pending ? `${open}${text}` : `${open}${text}</${name}>`;
};

const escapeXml = (raw: string): string => raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Whether a message is the reader's own prompt. Role alone cannot say: tool results travel back as
 * `user`-role messages (the AI protocol convention), and a synthetic turn is system-generated input
 * — neither is the reader speaking, so neither gets the prompt frame or counts as a stop.
 */
export const isPrompt = (message: Message.Message): boolean =>
  message.sender.role === 'user' &&
  message.blocks.some((block) => block._tag === 'text' && block.disposition !== 'synthetic');

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
