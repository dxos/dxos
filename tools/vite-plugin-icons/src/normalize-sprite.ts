//
// Copyright 2026 DXOS.org
//

// Matches one complete symbol; symbols never nest, so a lazy body is exact.
const SYMBOL = /<symbol\b([^>]*)>([\s\S]*?)<\/symbol>/g;
const FILL_ATTR = /\s+fill\s*=\s*(?:"[^"]*"|'[^']*')/g;
const ID_ATTR = /\bid\s*=\s*(?:"([^"]*)"|'([^']*)')/;

// Any `fill`/`stroke` declaration on the glyph's own elements, as an attribute or inside a `style`.
// `fill-rule` and `stroke-width` do not match: the `-` sits where the separator has to be.
const PAINT = /(?:^|[\s;"'{])(?:fill|stroke)\s*[:=]\s*["']?\s*([^;"'}\s>]+)/g;

// Values that either inherit or paint nothing, so they cannot fight the symbol's fill. Anything else
// is a pinned paint — classified this way round rather than by listing colors, since CSS has ~150
// named ones and the interesting case is always "not inheriting", never a specific hue. `var()` is
// allowed through because its value is unknowable here and flagging it would be noise.
const INHERITING = new Set([
  'currentcolor',
  'none',
  'inherit',
  'initial',
  'revert',
  'revert-layer',
  'transparent',
  'unset',
  'context-fill',
  'context-stroke',
]);

const isPinnedPaint = (value: string) => {
  const normalized = value.toLowerCase();
  return !INHERITING.has(normalized) && !normalized.startsWith('var(');
};

const hasPinnedPaint = (body: string) => {
  for (const [, value] of body.matchAll(PAINT)) {
    if (isPinnedPaint(value)) {
      return true;
    }
  }
  return false;
};

export type NormalizeSpriteResult = {
  svg: string;
  /** Ids of symbols whose own markup pins a color, which no attribute on the symbol can override. */
  hardcoded: string[];
};

/**
 * Forces `fill="currentColor"` onto every symbol in a sprite.
 *
 * A glyph that declares no fill defaults to black and vanishes against a dark surface, and vector
 * editors drop the attribute on every re-export — so patching the source SVG loses the race. This
 * mirrors what the runtime registry already does when it ingests a standalone SVG
 * (`ingestSvgChildrenAsSymbol`), so a glyph renders the same whether it arrived via the sprite or a
 * runtime fetch.
 *
 * Idempotent: the sprite is rewritten on every icon addition, and re-normalizing is a no-op.
 *
 * An inline `style` on the glyph's own elements still wins over the symbol's attribute, so those
 * are reported rather than rewritten — guessing which literal color was meant to be the foreground
 * would silently recolor legitimately multi-tone artwork.
 */
export const normalizeSprite = (svg: string): NormalizeSpriteResult => {
  const hardcoded: string[] = [];
  const normalized = svg.replace(SYMBOL, (_match, attrs: string, body: string) => {
    if (hasPinnedPaint(body)) {
      const id = attrs.match(ID_ATTR);
      hardcoded.push(id?.[1] ?? id?.[2] ?? '<unnamed symbol>');
    }
    return `<symbol${attrs.replace(FILL_ATTR, '')} fill="currentColor">${body}</symbol>`;
  });

  return { svg: normalized, hardcoded };
};
