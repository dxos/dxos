//
// Copyright 2026 DXOS.org
//

import { type ContentBlock } from '@dxos/types';

import { type Chunk, type ChunkRenderer } from '../model';

/**
 * One renderable block of a message.
 *
 * Keyed by position rather than by identity: ECHO may hand out a fresh proxy per property access,
 * so a block's object identity is not stable enough to key a document by — but a message's blocks
 * only ever grow at the tail while it streams, which is what makes the index stable.
 */
export type MessageChunk = Chunk & { text: string };

/** Blocks this stack renders as document text; everything else is the tile's to draw. */
const isTextual = (block: ContentBlock.Any): block is ContentBlock.Text => block._tag === 'text';

/** Text of a block, or the empty string for one the document does not render. */
export const getBlockText = (block: ContentBlock.Any): string => (isTextual(block) ? block.text : '');

/** Text of every rendered block, as the document holds it. */
export const getMessageChunkText = (blocks: readonly ContentBlock.Any[]): string =>
  blocks.filter(isTextual).map(getBlockText).join('\n');

/**
 * The blocks of a message, in order, as chunks.
 *
 * Only textual blocks reach the document. A reference or a proposal is a card the tile renders as
 * React beside the body, which is what keeps this editor's content plain markdown — it wraps, it is
 * selectable, and find matches it without stepping through markup.
 *
 * A draft collapses the message to a single chunk: what is being edited is the body as one piece of
 * text, and reaching the stored blocks again is what committing means. Everything the model needs to
 * hold the draft steady follows from that — a peer's revision of the message re-renders the same
 * single chunk, so it cannot rewrite the text under the caret.
 */
export const buildMessageChunks = (
  blocks: readonly ContentBlock.Any[],
  options: { draft?: string } = {},
): MessageChunk[] => {
  if (options.draft !== undefined) {
    return [{ id: 'draft', text: options.draft }];
  }

  return blocks.flatMap((block, index) => (isTextual(block) ? [{ id: `block:${index}`, text: block.text }] : []));
};

/**
 * Renders a chunk to document text.
 *
 * The separator is written *before* each chunk rather than after it, so the last one has no trailing
 * newline: while a message streams its tail grows, and a separator written ahead of the next block
 * would make that growth a replacement rather than an extension — the one case a typewriter can
 * animate, and the reason the model reports appends separately at all.
 */
export const renderMessageChunk: ChunkRenderer<MessageChunk> = (chunk, index) =>
  index === 0 ? chunk.text : `\n${chunk.text}`;
