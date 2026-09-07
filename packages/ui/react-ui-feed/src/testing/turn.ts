//
// Copyright 2026 DXOS.org
//

import { random } from '@dxos/random';
import { type ContentBlock } from '@dxos/types';

import { createAnswer, textStream } from './stream';

export type TurnOptions = {
  chunkDelay?: number;
  wordsPerChunk?: number;
  /** Tool calls in the run, so a panel that summarises a run is driven with more than one. */
  calls?: number;
  /** 1-based call that comes back as an error, exercising the failure summary. */
  failAt?: number;
};

/**
 * One assistant turn as the blocks a model actually emits, arriving in order.
 *
 * The text-only stream exercises the easy half of reconciliation: a tail that only ever grows, which
 * the item appends. A real turn is harder in three ways, and each is a separate way for an item to
 * be rebuilt instead of extended —
 *
 * 1. a **status** block appears first and is removed once work begins, so the document shrinks;
 * 2. **reasoning** streams inside an unclosed tag and is closed when it completes, which rewrites
 *    the end of the document rather than appending to it;
 * 3. a **tool call** lands whole, then its **result** arrives as a second block after it — and a
 *    run of them arrives one call at a time, which is what a panel summarising the run has to
 *    track while it is still growing.
 *
 * Yields the complete block array at each step; the caller replaces the message's blocks with it.
 */
export async function* streamTurn({
  chunkDelay = 120,
  wordsPerChunk = 4,
  calls = 1,
  failAt,
}: TurnOptions = {}): AsyncGenerator<ContentBlock.Any[], void> {
  const pause = () => new Promise((resolve) => setTimeout(resolve, chunkDelay));

  // A status the reader sees before anything else exists, and which is gone by the answer.
  const status: ContentBlock.Any = { _tag: 'status', statusText: 'Thinking…', pending: true };
  yield [status];
  await pause();

  let reasoning = '';
  for await (const chunk of textStream(random.lorem.paragraph(), { chunkDelay, wordsPerChunk })) {
    reasoning += chunk;
    yield [status, { _tag: 'reasoning', reasoningText: reasoning, pending: true }];
  }

  // Closing the tag and dropping the status in one step: the document does not grow here, and an
  // item that only knows how to append would replace itself instead.
  const reasoned: ContentBlock.Any = { _tag: 'reasoning', reasoningText: reasoning };
  yield [reasoned];
  await pause();

  // A run arrives one call at a time, each unanswered until its result lands — the state a panel
  // reports as "in flight" before it can report a count.
  const names = ['search', 'read_document', 'write_document', 'summarize'];
  const tools: ContentBlock.Any[] = [];
  for (let index = 0; index < calls; index++) {
    const toolCallId = `tool-${random.number.int({ min: 1000, max: 9999 })}`;
    const name = names[index % names.length];
    const call: ContentBlock.Any = {
      _tag: 'toolCall',
      toolCallId,
      name,
      input: JSON.stringify({ query: random.lorem.word() }),
      providerExecuted: false,
      pending: true,
    };
    yield [reasoned, ...tools, call];
    await pause();

    tools.push({ ...call, pending: false });
    tools.push(
      failAt === index + 1
        ? {
            _tag: 'toolResult',
            toolCallId,
            name,
            error: 'ENOENT: no such file or directory',
            providerExecuted: false,
          }
        : {
            _tag: 'toolResult',
            toolCallId,
            name,
            result: random.lorem.sentence(12),
            providerExecuted: false,
          },
    );
    yield [reasoned, ...tools];
    await pause();
  }

  let text = '';
  for await (const chunk of textStream(createAnswer(), { chunkDelay, wordsPerChunk })) {
    text += chunk;
    yield [reasoned, ...tools, { _tag: 'text', text, pending: true }];
  }

  // Suggestions arrive only once the answer is complete, so the last step both closes the text and
  // extends the message — the two kinds of change at once.
  yield [
    reasoned,
    ...tools,
    { _tag: 'text', text },
    { _tag: 'suggestion', text: 'Tell me more' },
    { _tag: 'suggestion', text: 'Show the sources' },
  ];
}
