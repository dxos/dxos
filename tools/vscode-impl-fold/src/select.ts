//
// Copyright 2026 DXOS.org
//

/** Inclusive zero-based line span. */
export type LineRange = { start: number; end: number };

/** Language-agnostic view of a `vscode.DocumentSymbol`; `kind` is the `vscode.SymbolKind` member name. */
export type SymbolNode = {
  kind: string;
  range: LineRange;
  /** Line of the symbol's name. */
  selectionLine: number;
  children: SymbolNode[];
};

/** Language-agnostic view of a `vscode.FoldingRange`. */
export type FoldRange = LineRange & { kind?: 'comment' | 'imports' | 'region' };

export type SelectOptions = {
  /** Symbol kinds whose body is always an implementation (e.g. `Function`, `Method`). */
  bodyKinds: readonly string[];
  /** Symbol kinds whose body is an implementation only when the value is a function (e.g. `const f = () => {}`). */
  valueKinds: readonly string[];
};

export type SelectInput = SelectOptions & {
  symbols: readonly SymbolNode[];
  foldingRanges: readonly FoldRange[];
  lineAt: (line: number) => string;
};

export const DEFAULT_OPTIONS: SelectOptions = {
  bodyKinds: ['Function', 'Method', 'Constructor'],
  valueKinds: ['Variable', 'Constant', 'Property', 'Field'],
};

const FUNCTION_VALUE = /=>|\bfunction\b|\blambda\b/;

/**
 * Picks the folding ranges that hold implementation bodies, leaving signatures, types and class shells visible.
 * A body is the widest code folding range that starts on or after the symbol's name and ends where the symbol ends,
 * so a multi-line parameter list (which ends early) is never mistaken for it.
 */
export const selectBodies = ({ symbols, foldingRanges, lineAt, bodyKinds, valueKinds }: SelectInput): LineRange[] => {
  const codeRanges = foldingRanges.filter((range) => range.kind === undefined && range.end > range.start);
  const bodies: LineRange[] = [];

  const findBody = (symbol: SymbolNode): LineRange | undefined => {
    let best: LineRange | undefined;
    for (const range of codeRanges) {
      // Providers end a brace block on the line before its closing brace.
      const endsWithSymbol = range.end <= symbol.range.end && range.end >= symbol.range.end - 1;
      if (range.start >= symbol.selectionLine && range.start <= symbol.range.end && endsWithSymbol) {
        if (!best || range.start < best.start) {
          best = range;
        }
      }
    }

    // Languages without a folding provider fold by indentation from the declaration line.
    if (!best && foldingRanges.length === 0 && symbol.range.end > symbol.selectionLine) {
      best = { start: symbol.selectionLine, end: symbol.range.end };
    }

    return best;
  };

  const isFunctionValue = (symbol: SymbolNode, body: LineRange): boolean => {
    for (let line = symbol.selectionLine; line <= body.start; line++) {
      if (FUNCTION_VALUE.test(lineAt(line))) {
        return true;
      }
    }
    return false;
  };

  const visit = (nodes: readonly SymbolNode[]) => {
    for (const symbol of nodes) {
      const isBody = bodyKinds.includes(symbol.kind);
      const isValue = !isBody && valueKinds.includes(symbol.kind);
      if (isBody || isValue) {
        const body = findBody(symbol);
        if (body && (isBody || isFunctionValue(symbol, body))) {
          // Nested symbols are hidden inside the folded body.
          bodies.push(body);
          continue;
        }
      }
      visit(symbol.children);
    }
  };

  visit(symbols);
  return bodies.sort((left, right) => left.start - right.start);
};
