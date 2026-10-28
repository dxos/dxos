//
// Copyright 2026 DXOS.org
//

/**
 * Regex matching the opening fence of a Spec mdl block.
 * All Spec blocks use ```mdl; the block type lives on the first body line.
 */
export const FENCE_REGEX = /^```mdl\s*$/gm;

export type BlockHeader = { type: string; id: string; from: number; to: number; body: string };

/**
 * Extracts block headers from the raw document text.
 * Returns { type, id, from, to, body } for each fenced block opening,
 * reading the block type from the first line of the block body.
 */
export const parseBlockHeaders = (text: string): BlockHeader[] => {
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

    // An unclosed block (mid-edit) ends at the next fence of either kind, or at the end of the text.
    const endMatch = /^```/m.exec(text.slice(firstBodyLineStart));
    const body = endMatch
      ? text.slice(firstBodyLineStart, firstBodyLineStart + endMatch.index)
      : text.slice(firstBodyLineStart);

    // First body line: "<blockType> [name][: label]"
    const lineMatch = firstBodyLine.match(/^(\w+)(?:\s+([^\s:][^\n:]*?))?(?::\s*[^\n]*)?\s*$/);
    const blockType = lineMatch?.[1] ?? '';
    const id = lineMatch?.[2]?.trim() ?? '';
    results.push({ type: blockType, id, from: match.index, to: match.index + match[0].length, body });
  }
  return results;
};

/** One fenced `mdl` block: its type, identifier and title from the header line, and the body below it. */
export type MdlBlock = {
  type: string;
  /** Empty for a block with no identifier. */
  id: string;
  /** The prose after the header's colon, if any. */
  title?: string;
  /** The block's lines after the header. */
  body: string;
  /** Offset of the opening fence in the text. */
  from: number;
};

/** Every fenced `mdl` block of a spec, in document order. */
export const parseMdlBlocks = (text: string): MdlBlock[] =>
  parseBlockHeaders(text).map(({ type, id, from, body }) => {
    const newline = body.indexOf('\n');
    const header = newline === -1 ? body : body.slice(0, newline);
    const title = header.match(/^\s*\w+\s+[^\s:][^\n:]*?:\s*(.+?)\s*$/)?.[1];
    return { type, id, ...(title && { title }), body: newline === -1 ? '' : body.slice(newline + 1), from };
  });
