//
// Copyright 2026 DXOS.org
//

import { type CompletionContext, type CompletionResult, autocompletion } from '@codemirror/autocomplete';
import { type Extension } from '@codemirror/state';

import { FENCE_REGEX } from './lint';

// Standard fields for each block type.
// In future this will be derived from resolved `ext` definitions.
const BLOCK_FIELDS: Record<string, string[]> = {
  ext: ['uri', 'desc', 'extends', 'fields', 'adds-fields', 'nesting', 'inline-prose', 'example'],
  type: ['desc', 'fields', 'literals', 'extends'],
  op: ['desc', 'input', 'output', 'errors', 'effects', 'requires', 'invariants', 'note'],
  feat: ['desc', 'req'],
  test: ['given', 'when', 'then', 'tags'],
  component: ['desc', 'props', 'state', 'slots', 'actions', 'emits', 'layout'],
  service: ['desc', 'loading', 'ops', 'errors', 'note'],
  db: ['desc', 'backend', 'entities', 'queries', 'note'],
};

/**
 * Returns field-name completions when inside a Spec fenced block.
 * Detects the block type from the first line of the block body and suggests known fields.
 */
const mdlCompletionSource = (context: CompletionContext): CompletionResult | null => {
  const { state, pos } = context;
  const text = state.doc.toString();
  const before = text.slice(0, pos);

  // Find the innermost open ```mdl fence above the cursor.
  const openFences = [...before.matchAll(new RegExp(FENCE_REGEX.source, FENCE_REGEX.flags))];
  const closeFences = [...before.matchAll(/^```\s*$/gm)];
  if (openFences.length === 0 || openFences.length <= closeFences.length) {
    return null; // not inside a block
  }

  const lastOpen = openFences[openFences.length - 1];
  const fenceEnd = lastOpen.index! + lastOpen[0].length;

  // Read block type from the first body line (immediately after the fence header).
  const newlineAfterFence = text.indexOf('\n', fenceEnd);
  if (newlineAfterFence === -1) {
    return null; // block has no body yet
  }
  const firstBodyStart = newlineAfterFence + 1;
  const firstBodyEnd = text.indexOf('\n', firstBodyStart);
  const firstBodyLine = (
    firstBodyEnd === -1 ? text.slice(firstBodyStart) : text.slice(firstBodyStart, firstBodyEnd)
  ).trim();
  const blockType = firstBodyLine.match(/^(\w+)/)?.[1] ?? '';

  const fields = BLOCK_FIELDS[blockType];
  if (!fields) {
    return null;
  }

  // Do not complete on the first body line (the block type header itself).
  if (firstBodyEnd !== -1 && pos <= firstBodyEnd) {
    return null;
  }

  // Only complete at the start of a line (field name position).
  const lineStart = before.lastIndexOf('\n') + 1;
  const partial = before.slice(lineStart);
  if (partial.includes(':')) {
    return null;
  }

  const word = context.matchBefore(/\w[\w-]*/);
  if (!word && !context.explicit) {
    return null;
  }

  return {
    from: word ? word.from : pos,
    options: fields.map((field) => ({
      label: field,
      type: 'property',
      apply: `${field}: `,
    })),
  };
};

/**
 * Autocompletion extension for Spec .mdl documents.
 */
export const mdlComplete: Extension = autocompletion({ override: [mdlCompletionSource] });
