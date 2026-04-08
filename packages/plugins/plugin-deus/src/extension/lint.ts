//
// Copyright 2026 DXOS.org
//

import { type Diagnostic, linter } from '@codemirror/lint';
import { type EditorView } from '@codemirror/view';

import { BLOCK_TYPES } from './constants';

const KNOWN_BLOCK_TYPES = new Set(BLOCK_TYPES);

/**
 * Shared regex for matching fenced block headers in MDL documents.
 * Matches: ```<type> [id][: label]
 */
export const FENCE_REGEX = /^```(\w+)(?:\s+([^\n:]+))?(?::\s*[^\n]*)?\s*$/gm;

/**
 * Extracts block headers from the raw document text.
 * Returns { type, id, from, to } for each fenced block opening.
 */
const parseBlockHeaders = (text: string): { type: string; id: string; from: number; to: number }[] => {
  const results: { type: string; id: string; from: number; to: number }[] = [];
  const regex = new RegExp(FENCE_REGEX.source, FENCE_REGEX.flags);
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    results.push({ type: match[1], id: match[2]?.trim() ?? '', from: match.index, to: match.index + match[0].length });
  }
  return results;
};

/**
 * Lint extension for Deus .mdl documents.
 *
 * Checks:
 *   - Unknown block types → error
 *   - (future) Missing required fields → error
 *   - (future) Unresolved cross-references → error
 */
export const mdlLint = linter((view: EditorView): Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];
  const text = view.state.doc.toString();
  const headers = parseBlockHeaders(text);

  for (const { type, from, to } of headers) {
    if (!KNOWN_BLOCK_TYPES.has(type as (typeof BLOCK_TYPES)[number])) {
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
