//
// Copyright 2026 DXOS.org
//

const escape = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Declarations, most specific first: a top-level declaration beats a member, which beats a bare mention. */
const declarationPatterns = (name: string): RegExp[] => {
  const id = escape(name);
  return [
    new RegExp(
      `^\\s*(?:export\\s+)?(?:default\\s+)?(?:declare\\s+)?(?:abstract\\s+)?(?:async\\s+)?(?:class|interface|type|enum|function\\*?|const|let|var|namespace)\\s+${id}\\b`,
    ),
    new RegExp(
      `^\\s*(?:(?:public|private|protected|static|readonly|override|async|get|set|#)\\s*)*${id}\\s*(?:\\??[:(<=])`,
    ),
    new RegExp(`\\b${id}\\b`),
  ];
};

/**
 * The 1-based line that declares a symbol in a source file, or undefined when it is not there. A dotted name
 * (`Spec.make`, `Class.method`) finds the outer declaration first and then the member after it.
 */
export const findSymbolLine = (content: string, symbol: string): number | undefined => {
  const lines = content.split('\n');
  let start = 0;
  let found: number | undefined;
  for (const [index, part] of symbol.split('.').entries()) {
    found = undefined;
    const [declaration, member, mention] = declarationPatterns(part);
    // After the owner, a member is what the dotted name means; a later top-level namesake is not.
    for (const pattern of index === 0 ? [declaration, member, mention] : [member, declaration, mention]) {
      const index = lines.findIndex((line, number) => number >= start && pattern.test(line));
      if (index >= 0) {
        found = index;
        break;
      }
    }
    if (found === undefined) {
      return undefined;
    }
    start = found + 1;
  }
  return found === undefined ? undefined : found + 1;
};

/** The longest declaration a snippet shows; a longer one ends with an ellipsis line. */
const MAX_SNIPPET_LINES = 16;

/** A short excerpt of a source file: its first line number (1-based) and its lines. */
export type Snippet = { line: number; lines: string[]; truncated: boolean };

const depthChange = (line: string): number => {
  // Quoted text and line comments do not open or close a block.
  const code = line.replace(/(["'`])(?:\\.|(?!\1).)*\1/g, '').replace(/\/\/.*$/, '');
  return (code.match(/[{([]/g)?.length ?? 0) - (code.match(/[})\]]/g)?.length ?? 0);
};

/**
 * The declaration a key names, as shown on hover: from the declaring line to where its brackets close, or the
 * file's opening lines (after the copyright header) when there is no symbol. Undefined when the symbol is not there.
 */
export const declarationSnippet = (content: string, symbol?: string): Snippet | undefined => {
  const lines = content.split('\n');
  let start: number;
  if (symbol) {
    const found = findSymbolLine(content, symbol);
    if (found === undefined) {
      return undefined;
    }
    start = found - 1;
  } else {
    start = 0;
    while (start < lines.length && (lines[start].startsWith('//') || lines[start].trim() === '')) {
      start++;
    }
  }

  let end = start;
  let depth = depthChange(lines[start] ?? '');
  // A declaration continues while a bracket it opened is still open.
  while (symbol && depth > 0 && end + 1 < lines.length) {
    end++;
    depth += depthChange(lines[end]);
  }
  if (!symbol) {
    end = Math.min(lines.length - 1, start + MAX_SNIPPET_LINES - 1);
  }
  const truncated = end - start + 1 > MAX_SNIPPET_LINES;
  return {
    line: start + 1,
    lines: lines.slice(start, truncated ? start + MAX_SNIPPET_LINES : end + 1),
    truncated: truncated || (!symbol && end < lines.length - 1),
  };
};
