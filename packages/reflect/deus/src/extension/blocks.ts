//
// Copyright 2026 DXOS.org
//

/**
 * Regex matching the opening fence of a Spec mdl block.
 * All Spec blocks use ```mdl; the block type lives on the first body line.
 */
export const FENCE_REGEX = /^```mdl\s*$/gm;

export type BlockHeader = { type: string; id: string; from: number; to: number; body: string };

/** One line of a spec text, classified by its fence context. */
export type FenceLine = {
  line: string;
  /** Offset of the line in the text. */
  offset: number;
  /** `prose` is outside any fence; `open`/`close` are fence lines; `body` is inside a fence. */
  kind: 'prose' | 'open' | 'body' | 'close';
  /** For `open` and `body`: whether the enclosing fence is a top-level `mdl` block. */
  mdl: boolean;
};

/**
 * Classifies each line of the text by CommonMark fence rules: a fence closes only on a line of the
 * opener's character, at least as long, with no info string, so an example fence encloses nested ones.
 */
export const scanFenceLines = (text: string, visit: (line: FenceLine) => void): void => {
  let fence: { char: string; length: number; mdl: boolean } | undefined;
  let offset = 0;
  for (const line of text.split('\n')) {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    const info = marker?.[2].trim() ?? '';
    if (fence) {
      if (marker && marker[1][0] === fence.char && marker[1].length >= fence.length && info === '') {
        visit({ line, offset, kind: 'close', mdl: fence.mdl });
        fence = undefined;
      } else {
        visit({ line, offset, kind: 'body', mdl: fence.mdl });
      }
    } else if (marker && !(marker[1][0] === '`' && info.includes('`'))) {
      fence = { char: marker[1][0], length: marker[1].length, mdl: info === 'mdl' };
      visit({ line, offset, kind: 'open', mdl: fence.mdl });
    } else {
      visit({ line, offset, kind: 'prose', mdl: false });
    }
    offset += line.length + 1;
  }
};

/**
 * Extracts block headers from the raw document text.
 * Returns { type, id, from, to, body } for each top-level `mdl` fence,
 * reading the block type from the first line of the block body.
 * An unclosed block (mid-edit) runs to the end of the text.
 */
export const parseBlockHeaders = (text: string): BlockHeader[] => {
  const results: BlockHeader[] = [];
  let current: { from: number; to: number; bodyStart: number; bodyEnd: number } | undefined;
  const flush = () => {
    if (!current) {
      return;
    }
    const body = text.slice(current.bodyStart, current.bodyEnd);
    const firstBodyLine = body.split('\n', 1)[0].trim();
    // First body line: "<blockType> [name][: label]"
    const lineMatch = firstBodyLine.match(/^(\w+)(?:\s+([^\s:][^\n:]*?))?(?::\s*[^\n]*)?\s*$/);
    results.push({
      type: lineMatch?.[1] ?? '',
      id: lineMatch?.[2]?.trim() ?? '',
      from: current.from,
      to: current.to,
      body,
    });
    current = undefined;
  };

  scanFenceLines(text, ({ line, offset, kind, mdl }) => {
    // A top-level `mdl` opener inside an unclosed block ends it, since a block never nests (mid-edit).
    const reopens = kind === 'body' && mdl && /^ {0,3}`{3,}mdl\s*$/.test(line);
    if (reopens && current) {
      current.bodyEnd = offset;
      flush();
    }
    if ((kind === 'open' && mdl) || reopens) {
      current = { from: offset, to: offset + line.length, bodyStart: offset + line.length + 1, bodyEnd: text.length };
    } else if (kind === 'close' && mdl) {
      if (current) {
        current.bodyEnd = offset;
      }
      flush();
    }
  });
  flush();
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

/** A block header line: `<type> [<id>][: <title>]`. */
export const BLOCK_HEADER_LINE = /^(\w+)(\s+[^\s:][^\n:]*?)?(:\s*.*)?\s*$/;

/** The terms a document's `## Extensions` table declares: the backticked first cell of each row. */
export const extensionTerms = (text: string): string[] => {
  const terms: string[] = [];
  let inExtensions = false;
  scanFenceLines(text, ({ line, kind }) => {
    if (kind !== 'prose') {
      return;
    }
    if (/^## /.test(line)) {
      inExtensions = /^## Extensions\s*$/.test(line);
    } else if (inExtensions) {
      const term = line.match(/^\|\s*`([\w-]+)`/)?.[1];
      if (term) {
        terms.push(term);
      }
    }
  });
  return terms;
};

/** A block header that follows another block inside the same fence. */
export type InnerBlockHeader = { type: string; id: string; from: number; to: number };

/**
 * Finds the block headers an `mdl` fence hides after its first block: lines past the fence's first body line, at
 * column 0 (a block body is always indented), whose first word is one of `types`.
 */
export const findInnerBlockHeaders = (text: string, types: ReadonlySet<string>): InnerBlockHeader[] => {
  const headers: InnerBlockHeader[] = [];
  let first = false;
  scanFenceLines(text, ({ line, offset, kind, mdl }) => {
    // A top-level `mdl` opener inside an unclosed block starts a new block, as in `parseBlockHeaders`.
    if (kind === 'open' || (kind === 'body' && mdl && /^ {0,3}`{3,}mdl\s*$/.test(line))) {
      first = true;
    } else if (kind === 'body' && mdl) {
      if (first) {
        first = false;
        return;
      }
      const match = line.match(BLOCK_HEADER_LINE);
      if (match && types.has(match[1])) {
        headers.push({ type: match[1], id: match[2]?.trim() ?? '', from: offset, to: offset + line.length });
      }
    }
  });
  return headers;
};
