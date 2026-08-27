//
// Copyright 2026 DXOS.org
//

// Matches one complete symbol; symbols never nest, so a lazy body is exact.
const SYMBOL = /<symbol\b([^>]*)>([\s\S]*?)<\/symbol>/g;
const FILL_ATTR = /\s+fill\s*=\s*(?:"[^"]*"|'[^']*')/g;
const ID_ATTR = /\bid\s*=\s*(?:"([^"]*)"|'([^']*)')/;

// Colors an editor emits when it does not know the glyph has to inherit. Deliberately narrow —
// `none`, `currentColor` and `inherit` are all legitimate, and a false positive here is a warning
// on a working icon.
const HARDCODED_COLOR = /(?:fill|stroke)\s*[:=]\s*["']?\s*(#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\(|black\b|white\b)/;

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
    if (HARDCODED_COLOR.test(body)) {
      const id = attrs.match(ID_ATTR);
      hardcoded.push(id?.[1] ?? id?.[2] ?? '<unnamed symbol>');
    }
    return `<symbol${attrs.replace(FILL_ATTR, '')} fill="currentColor">${body}</symbol>`;
  });

  return { svg: normalized, hardcoded };
};
