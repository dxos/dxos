//
// Copyright 2026 DXOS.org
//

import * as Array from 'effect/Array';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';

/** The assistant's reply shape: a conversation tail whose last text block carries the answer. */
type Reply = ReadonlyArray<{ sender: { role?: string }; blocks: ReadonlyArray<{ _tag: string }> }>;

/** The text of the last assistant text block, or none when the model produced no text. */
export const lastText = (result: Reply): Option.Option<string> =>
  Function.pipe(
    result,
    Array.findLast((message) => message.sender.role === 'assistant' && message.blocks.some((b) => b._tag === 'text')),
    Option.flatMap((message) =>
      Function.pipe(
        message.blocks,
        Array.findLast((block): block is { _tag: 'text'; text: string } => block._tag === 'text'),
        Option.map((block) => block.text),
      ),
    ),
  );

/**
 * Parses a JSON array out of a model reply, tolerating the ```json fence models add unprompted.
 * Returns none rather than throwing: a malformed reply is a retry, not a crash.
 */
export const parseJsonArray = (text: string): Option.Option<unknown[]> => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = (fenced?.[1] ?? text).trim();
  const start = body.indexOf('[');
  const end = body.lastIndexOf(']');
  if (start === -1 || end <= start) {
    return Option.none();
  }

  try {
    const parsed: unknown = JSON.parse(body.slice(start, end + 1));
    return globalThis.Array.isArray(parsed) ? Option.some(parsed) : Option.none();
  } catch {
    return Option.none();
  }
};
