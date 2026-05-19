//
// Copyright 2026 DXOS.org
//

import { type Diagnostic, linter } from '@codemirror/lint';
import { type EditorView } from '@codemirror/view';

import { BLOCK_TYPES } from './constants';

const KNOWN_BLOCK_TYPES = new Set(BLOCK_TYPES);

/**
 * Regex matching the opening fence of a Spec mdl block.
 * All Spec blocks use ```mdl; the block type lives on the first body line.
 */
export const FENCE_REGEX = /^```mdl\s*$/gm;

/**
 * Extracts block headers from the raw document text.
 * Returns { type, id, from, to } for each fenced block opening,
 * reading the block type from the first line of the block body.
 */
const parseBlockHeaders = (text: string): { type: string; id: string; from: number; to: number }[] => {
  const results: { type: string; id: string; from: number; to: number }[] = [];
  const fenceRe = new RegExp(FENCE_REGEX.source, FENCE_REGEX.flags);
  let match: RegExpExecArray | null;
  while ((match = fenceRe.exec(text)) !== null) {
    const fenceEnd = match.index + match[0].length;
    const bodyStart = text.indexOf('\n', fenceEnd);
    if (bodyStart === -1) {
      continue;
    }
    const firstBodyLineStart = bodyStart + 1;
    const firstBodyLineEnd = text.indexOf('\n', firstBodyLineStart);
    const firstBodyLine = (
      firstBodyLineEnd === -1 ? text.slice(firstBodyLineStart) : text.slice(firstBodyLineStart, firstBodyLineEnd)
    ).trim();

    // First body line: "<blockType> [name][: label]"
    const lineMatch = firstBodyLine.match(/^(\w+)(?:\s+([^\s:][^\n:]*?))?(?::\s*[^\n]*)?\s*$/);
    const blockType = lineMatch?.[1] ?? '';
    const id = lineMatch?.[2]?.trim() ?? '';
    results.push({ type: blockType, id, from: match.index, to: match.index + match[0].length });
  }
  return results;
};

/**
 * Lint extension for Spec .mdl documents.
 *
 * Checks:
 *   - Unknown block types (first body line of ```mdl blocks) → error
 *   - (future) Missing required fields → error
 *   - (future) Unresolved cross-references → error
 */
export const mdlLint = linter((view: EditorView): Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];
  const text = view.state.doc.toString();
  const headers = parseBlockHeaders(text);

  for (const { type, from, to } of headers) {
    if (type && !KNOWN_BLOCK_TYPES.has(type as (typeof BLOCK_TYPES)[number])) {
      diagnostics.push({
        from,
        to,
        severity: 'error',
        message: `Unknown block type "${type}". Declare it in the Extensions table or define it with an \`ext\` block.`,
      });
    }
  }

  return diagnostics;
});
