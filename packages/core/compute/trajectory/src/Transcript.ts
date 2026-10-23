//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { type ContentBlock } from '@dxos/types';

/**
 * One thread as another thread's prompt shows it: text only, because another thread's tool calls may still be
 * waiting for results, and a provider rejects a prompt holding a call without its result.
 */
export type Thread = {
  readonly id: string;
  readonly purpose?: string;
  readonly owner?: string;
  readonly status: 'running' | 'done';
  readonly entries: readonly {
    readonly role: string;
    readonly name?: string;
    readonly blocks: readonly ContentBlock.Any[];
  }[];
};

/** Entries a snapshot keeps from the end of a long thread; its first entry (the request) is always kept. */
export const TAIL_ENTRIES = 12;

/** Characters a tool call's arguments or result keep. */
export const TOOL_TEXT = 300;

/** Characters a single text block keeps. */
export const BLOCK_TEXT = 2_000;

const cut = (text: string, max: number): string => (text.length > max ? `${text.slice(0, max)}… (cut)` : text);

const renderBlock = (block: ContentBlock.Any): string | undefined => {
  switch (block._tag) {
    case 'text':
      return block.text.trim().length > 0 ? cut(block.text.trim(), BLOCK_TEXT) : undefined;
    case 'toolCall':
      return `[calls ${block.name}(${cut(block.input, TOOL_TEXT)})]`;
    case 'toolResult':
      return `[${block.name} returned: ${cut(
        typeof block.result === 'string'
          ? block.result
          : block.result === undefined
            ? 'an error'
            : JSON.stringify(block.result),
        TOOL_TEXT,
      )}]`;
    case 'reasoning':
    case 'stats':
    case 'status':
    case 'toolkit':
      return undefined;
    default:
      return `[${block._tag}]`;
  }
};

/**
 * The lines of a thread's transcript; a long thread keeps its first entry and its last {@link TAIL_ENTRIES}.
 */
export const lines = (entries: Thread['entries']): string[] => {
  const kept =
    entries.length > TAIL_ENTRIES + 1 ? [entries[0], undefined, ...entries.slice(-TAIL_ENTRIES)] : [...entries];
  return kept.flatMap((entry) => {
    if (entry === undefined) {
      return [`(${entries.length - TAIL_ENTRIES - 1} earlier entries left out)`];
    }
    const text = entry.blocks.flatMap((block) => renderBlock(block) ?? []).join('\n');
    return text.length > 0 ? [`${entry.name ?? entry.role}: ${text}`] : [];
  });
};

/**
 * One thread wrapped in its delimiters.
 */
export const render = (thread: Thread): string => {
  const attributes = [
    `id="${thread.id}"`,
    ...(thread.purpose ? [`title="${thread.purpose.replaceAll('"', "'")}"`] : []),
    ...(thread.owner ? [`owner="${thread.owner}"`] : []),
    `status="${thread.status}"`,
  ].join(' ');
  return [`<thread ${attributes}>`, ...lines(thread.entries), '</thread>'].join('\n');
};

/**
 * What a light thread starts with: the work of every thread running beside it, then the separator that tells the
 * model that work is not its own.
 */
export const snapshot = (siblings: readonly Thread[], self: string): string =>
  [
    ...siblings.map(render),
    '',
    siblings.length === 1
      ? 'The thread above is a separate request that is still running in parallel with this one.'
      : 'The threads above are separate requests that are still running in parallel with this one.',
    'Their work is not yours: do not repeat, continue or answer it.',
    `You are thread ${self}. Answer only the request that follows.`,
    "If it depends on a result one of those threads has not produced yet, call `thread_wait` with that thread's id;",
    'it returns once the thread ends, with what the thread did.',
  ].join('\n');

/**
 * One line of the latest state of a running thread, appended after the history when a turn starts.
 */
export const status = (thread: Thread): string => {
  const last = thread.entries.at(-1);
  const latest = last ? lines([last]).join(' ').replaceAll('\n', ' ') : 'nothing yet';
  return `Thread ${thread.id}${thread.purpose ? ` ("${thread.purpose}")` : ''} is ${thread.status}; latest: ${cut(latest, TOOL_TEXT)}`;
};
