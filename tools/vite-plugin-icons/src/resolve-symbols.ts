//
// Copyright 2026 DXOS.org
//

export type AssetStat = { mtimeMs: number; size: number };

export type ResolvedSymbol = {
  symbol: string;
  path: string;
};

export type ResolveSymbolsResult = {
  /** Symbols whose asset exists, in detection order. */
  resolved: ResolvedSymbol[];
  /**
   * Symbols with no asset behind them — a mistyped name, or an SVG not added yet — paired with the
   * path that was looked for. Excluded from the sprite rather than passed to `makeSprite`, whose
   * `readFile` would reject and, from the fire-and-forget debounced write, take the dev server down
   * with it. The path lets the caller watch for the file appearing.
   */
  missing: ResolvedSymbol[];
  /**
   * Identity of what a sprite built from `resolved` would contain: the symbol names plus each
   * asset's mtime and size. Unchanged fingerprint means an identical sprite, so the write can be
   * skipped; a redrawn SVG changes it even though the symbol set has not grown.
   */
  fingerprint: string;
};

export type ResolveSymbolsParams = {
  symbols: Iterable<string>;
  symbolPattern: string;
  /** Called with the pattern's capture groups, matching `@ch-ui/icons`' own contract. */
  assetPath: (...matches: string[]) => string;
  /** Returns undefined when the path does not exist. */
  stat: (path: string) => AssetStat | undefined;
};

/**
 * Splits detected symbols into those backed by an asset and those not, and fingerprints the former.
 *
 * Both halves exist to keep the dev server usable while icons are being drawn: a name with no file
 * is reported instead of thrown, and the fingerprint makes an edit to an existing SVG produce a
 * fresh sprite (counting symbols cannot, since redrawing changes no count).
 */
export const resolveSymbols = ({
  symbols,
  symbolPattern,
  assetPath,
  stat,
}: ResolveSymbolsParams): ResolveSymbolsResult => {
  const expression = new RegExp(symbolPattern);
  const resolved: ResolvedSymbol[] = [];
  const missing: ResolvedSymbol[] = [];
  const stamps: string[] = [];

  for (const symbol of symbols) {
    const match = symbol.match(expression);
    if (!match?.[1]) {
      // Unparseable names never reached `makeSprite` either; it skips them silently.
      continue;
    }
    const [, ...groups] = match;
    const path = assetPath(...groups.map((group) => group ?? ''));
    const stats = stat(path);
    if (stats) {
      resolved.push({ symbol, path });
      stamps.push(`${symbol}:${stats.mtimeMs}:${stats.size}`);
    } else {
      missing.push({ symbol, path });
    }
  }

  stamps.sort();
  return { resolved, missing, fingerprint: stamps.join('|') };
};
