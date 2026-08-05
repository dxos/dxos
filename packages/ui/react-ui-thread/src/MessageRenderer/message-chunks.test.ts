//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type ContentBlock } from '@dxos/types';

import { ChunkModel } from '../model';
import { buildMessageChunks, getMessageChunkText, renderMessageChunk } from './message-chunks';

const text = (text: string): ContentBlock.Any => ({ _tag: 'text', text }) as ContentBlock.Any;
const reference = (): ContentBlock.Any => ({ _tag: 'reference', reference: {} }) as unknown as ContentBlock.Any;

/** What the model would put in the document for these blocks. */
const render = (blocks: readonly ContentBlock.Any[], draft?: string): string => {
  const model = new ChunkModel(renderMessageChunk);
  model.set(buildMessageChunks(blocks, draft === undefined ? {} : { draft }));
  return model.text;
};

describe('message chunks', () => {
  test('a single block is the document, with no trailing separator', () => {
    expect(render([text('Hello.')])).toBe('Hello.');
  });

  test('blocks are separated by a newline', () => {
    expect(render([text('First.'), text('Second.')])).toBe('First.\nSecond.');
  });

  test('non-textual blocks are left to the tile', () => {
    expect(render([text('Body.'), reference()])).toBe('Body.');
    expect(getMessageChunkText([text('Body.'), reference()])).toBe('Body.');
  });

  test('the streaming tail extends the document rather than replacing it', () => {
    const model = new ChunkModel(renderMessageChunk);
    const applied: string[] = [];
    const document = {
      apply: (change: any) => applied.push(change.type),
    };

    model.set(buildMessageChunks([text('Once upon')]));
    model.sync(document);
    // The token that arrives next grows the same block — which the model must report as an append,
    // since that is the only change a typewriter can animate.
    model.set(buildMessageChunks([text('Once upon a time')]));
    model.sync(document);
    expect(applied).toEqual(['append', 'append']);
  });

  test('a block completing and the next one starting is still an extension', () => {
    const model = new ChunkModel(renderMessageChunk);
    const applied: string[] = [];
    const document = { apply: (change: any) => applied.push(change.type) };

    model.set(buildMessageChunks([text('First.')]));
    model.sync(document);
    model.set(buildMessageChunks([text('First.'), text('Second.')]));
    model.sync(document);
    expect(applied).toEqual(['append', 'append']);
  });

  test('a draft collapses the message to one chunk, so a peer revision cannot rewrite it', () => {
    const blocks = [text('Stored.'), text('Also stored.')];
    expect(render(blocks, 'What I am typing')).toBe('What I am typing');
    // The peer's revision lands in `blocks`, and the document still holds the draft.
    expect(render([text('Clobbered.')], 'What I am typing')).toBe('What I am typing');
  });

  test('an empty draft is a draft, not an absent one', () => {
    expect(render([text('Stored.')], '')).toBe('');
  });
});
