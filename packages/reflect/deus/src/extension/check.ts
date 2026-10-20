//
// Copyright 2026 DXOS.org
//

import { type Diagnostic } from '@codemirror/lint';

import { BLOCK_TYPES } from './constants.ts';

const KNOWN_BLOCK_TYPES = new Set(BLOCK_TYPES);

/**
 * Regex matching the opening fence of a Spec mdl block.
 * All Spec blocks use ```mdl; the block type lives on the first body line.
 */
export const FENCE_REGEX = /^```mdl\s*$/gm;

type BlockHeader = { type: string; id: string; from: number; to: number; body: string };

/**
 * Extracts block headers from the raw document text.
 * Returns { type, id, from, to, body } for each fenced block opening,
 * reading the block type from the first line of the block body.
 */
const parseBlockHeaders = (text: string): BlockHeader[] => {
  const results: BlockHeader[] = [];
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

    const closeMatch = /^```\s*$/m.exec(text.slice(firstBodyLineStart));
    const body = closeMatch ? text.slice(firstBodyLineStart, firstBodyLineStart + closeMatch.index) : '';

    // First body line: "<blockType> [name][: label]"
    const lineMatch = firstBodyLine.match(/^(\w+)(?:\s+([^\s:][^\n:]*?))?(?::\s*[^\n]*)?\s*$/);
    const blockType = lineMatch?.[1] ?? '';
    const id = lineMatch?.[2]?.trim() ?? '';
    results.push({ type: blockType, id, from: match.index, to: match.index + match[0].length, body });
  }
  return results;
};

const USER_REF = /^user:\S+$/;
const AGENT_REF = /^agent:\S+$/;

const fieldValue = (body: string, field: string): string | undefined =>
  body.match(new RegExp(`^\\s+${field}:[ \\t]*(.*?)[ \\t]*(?:#.*)?$`, 'm'))?.[1];

/**
 * Checks the attribution rules of the changelog dialect (`lang/changelog.mdl`), which keep
 * decisions made by people and decisions made by agents separable.
 */
const lintDecision = (body: string): string[] => {
  const errors: string[] = [];
  const by = fieldValue(body, 'by');
  const principal = fieldValue(body, 'for');
  const ratifiedBy = fieldValue(body, 'ratified-by');
  if (!by) {
    errors.push('Decision is missing `by:` — name the user: or agent: that made it.');
  } else if (AGENT_REF.test(by)) {
    if (!principal) {
      errors.push('Agent decision is missing `for:` — name the user: the agent acted for.');
    }
  } else if (USER_REF.test(by)) {
    if (principal !== undefined) {
      errors.push('`for:` applies only to agent decisions.');
    }
  } else {
    errors.push(`Decision \`by: ${by}\` must be \`user:<handle>\` or \`agent:<name>\`.`);
  }
  if (principal && !USER_REF.test(principal)) {
    errors.push(`\`for: ${principal}\` must be \`user:<handle>\`.`);
  }
  if (ratifiedBy !== undefined && !USER_REF.test(ratifiedBy)) {
    errors.push(`\`ratified-by: ${ratifiedBy}\` must be \`user:<handle>\`.`);
  }
  return errors;
};

/**
 * Lints the text of a Spec .mdl document.
 *
 * Checks:
 *   - Unknown block types (first body line of ```mdl blocks) → error
 *   - `decision` attribution (`by:` / `for:` / `ratified-by:` actor prefixes) → error
 *   - (future) Missing required fields → error
 *   - (future) Unresolved cross-references → error
 */
export const lintMdl = (text: string): Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];
  for (const { type, from, to, body } of parseBlockHeaders(text)) {
    if (type && !KNOWN_BLOCK_TYPES.has(type as (typeof BLOCK_TYPES)[number])) {
      diagnostics.push({
        from,
        to,
        severity: 'error',
        source: 'mdl/block-type',
        message: `Unknown block type "${type}". Declare it in the Extensions table or define it with an \`ext\` block.`,
      });
    } else if (type === 'decision') {
      for (const message of lintDecision(body)) {
        diagnostics.push({ from, to, severity: 'error', source: 'mdl/decision', message });
      }
    }
  }

  return diagnostics;
};
