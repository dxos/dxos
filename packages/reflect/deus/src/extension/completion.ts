//
// Copyright 2026 DXOS.org
//

import { FENCE_REGEX } from './blocks.ts';

// Standard fields for each block type.
// In future this will be derived from resolved `ext` definitions.
export const BLOCK_FIELDS: Record<string, string[]> = {
  ext: ['uri', 'desc', 'extends', 'fields', 'adds-fields', 'nesting', 'inline-prose', 'example'],
  type: ['desc', 'fields', 'literals', 'extends'],
  op: ['desc', 'input', 'output', 'errors', 'effects', 'requires', 'invariants', 'note'],
  feat: ['desc', 'req'],
  test: ['given', 'when', 'then', 'tags'],
  component: ['desc', 'props', 'state', 'slots', 'actions', 'emits', 'layout'],
  service: ['desc', 'loading', 'ops', 'errors', 'note'],
  db: ['desc', 'backend', 'entities', 'queries', 'note'],
  module: ['desc', 'api', 'styleguide'],
  decision: ['date', 'by', 'for', 'affects', 'supersedes', 'why', 'rejected', 'source'],
};

/**
 * The fields a cursor at `pos` may complete: inside an `mdl` fence, past its header line, before any `:` on the line.
 * Undefined anywhere else, or in a block whose type has no known fields.
 */
export const fieldCompletionContext = (
  text: string,
  pos: number,
): { blockType: string; fields: string[] } | undefined => {
  const before = text.slice(0, pos);

  // Find the innermost open ```mdl fence above the cursor.
  const openFences = [...before.matchAll(new RegExp(FENCE_REGEX.source, FENCE_REGEX.flags))];
  const closeFences = [...before.matchAll(/^```\s*$/gm)];
  if (openFences.length === 0 || openFences.length <= closeFences.length) {
    return undefined;
  }

  const lastOpen = openFences[openFences.length - 1];
  const fenceEnd = lastOpen.index + lastOpen[0].length;

  // Read block type from the first body line (immediately after the fence header).
  const newlineAfterFence = text.indexOf('\n', fenceEnd);
  if (newlineAfterFence === -1) {
    return undefined;
  }
  const firstBodyStart = newlineAfterFence + 1;
  const firstBodyEnd = text.indexOf('\n', firstBodyStart);
  const firstBodyLine = (
    firstBodyEnd === -1 ? text.slice(firstBodyStart) : text.slice(firstBodyStart, firstBodyEnd)
  ).trim();
  const blockType = firstBodyLine.match(/^(\w+)/)?.[1] ?? '';

  const fields = BLOCK_FIELDS[blockType];
  // The header line names the block type itself, so it takes no field.
  if (!fields || firstBodyEnd === -1 || pos <= firstBodyEnd) {
    return undefined;
  }

  // Only complete at the start of a line (field name position).
  const partial = before.slice(before.lastIndexOf('\n') + 1);
  return partial.includes(':') ? undefined : { blockType, fields };
};
