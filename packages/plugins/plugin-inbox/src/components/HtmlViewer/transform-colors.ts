//
// Copyright 2026 DXOS.org
//

// Content-aware recoloring of email HTML so it reads against the app theme instead of its authored
// (usually light) palette — light backgrounds are dropped so the app surface shows through, and text
// colors are remapped toward the theme ink while intentional colored backgrounds (buttons, banners)
// and sender-chosen colors are preserved. Adapted from macro-inc/macro (`core/email`). Operates on
// live DOM (needs `getComputedStyle`), so the subtree must be attached to the document first.
//
// DOM traversal APIs (`TreeWalker`, `Node.parentElement`) are untyped at the Text/Element boundary;
// the casts below narrow those results and are the standard idiom for walking a known node kind.
//
// TODO(wittjosiah): The color primitives here (sRGB↔OKLCH conversion, CSS color parsing, contrast) are
//   general-purpose and have no equivalent in our low-level UI packages today. Factor them out into a
//   shared lower-level color utility (e.g. under react-ui-theme) so other surfaces can reuse them,
//   leaving only the email-specific recoloring policy in this module.

type RGBA = { r: number; g: number; b: number; a: number };
type OKLCH = { l: number; c: number; h: number; a?: number };

type TextNodeContrast = {
  fg: OKLCH | null;
  bg: OKLCH | null;
  node: Text;
  insideAnchor: boolean;
};

export type ThemeColorParams = {
  inkL: number;
  inkC: number;
  inkH: number;
  panelL: number;
};

const CONTRAST_THRESHOLD = 0.5;
const EPSILON = 0.0001;
// OKLCH lightness above which a background counts as "light" (and is dropped so the app shows through).
const LIGHT_BG_THRESHOLD = 0.85;

/**
 * Recolors the email content so text sits in the theme palette with adequate contrast, dropping light
 * page backgrounds while keeping intentional colored backgrounds and sender-set colors.
 */
export const processEmailColors = (root: Element, theme: ThemeColorParams): void => {
  const { inkL, inkC, inkH, panelL } = theme;
  const themeIsDark = inkL > panelL;

  stripContentBackgrounds(root);

  for (const textNode of computeTextNodeColors(root)) {
    // Links are colored by the shadow's accent CSS rule (which also covers non-recolored emails), so
    // skip them here to avoid inverting their color to a dim mid-tone.
    if (textNode.insideAnchor) {
      continue;
    }
    // Sender explicitly set a background behind this text — trust their color choices, change nothing.
    if ((textNode.bg?.a ?? 0) > 0) {
      continue;
    }
    if (!textNode.fg) {
      continue;
    }

    const next: OKLCH = { ...textNode.fg };

    // Clamp text lightness toward the theme ink; in dark themes invert it so dark text becomes light.
    if (themeIsDark) {
      next.l = Math.min(1 - textNode.fg.l, inkL);
    } else {
      next.l = Math.max(textNode.fg.l, inkL);
    }

    // Monochrome text takes on the theme ink's chroma/hue so it reads as themed foreground.
    if (next.c < EPSILON) {
      next.c = inkC;
      next.h = inkH;
    }

    if (Math.abs(next.l - panelL) < CONTRAST_THRESHOLD) {
      const contrasted = findClosestContrastingColor(next, panelL);
      next.l = contrasted.l;
    }

    if (next.l !== textNode.fg.l || next.c !== textNode.fg.c || next.h !== textNode.fg.h) {
      setNodeColor(textNode.node, `oklch(${next.l} ${next.c} ${next.h})`);
    }
  }
};

/**
 * Resolves a computed CSS color string to OKLCH. Handles the two forms `getComputedStyle` returns for
 * these values — `oklch(...)` (theme tokens are authored in OKLCH) and `rgb(a)(...)`. Returns `null`
 * for transparent/unresolvable.
 */
export const cssColorToOklch = (color: string): OKLCH | null => {
  if (!color) {
    return null;
  }
  const value = color.trim().toLowerCase();
  const oklch = value.match(/^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)(%?)\s+([\d.]+)/);
  if (oklch) {
    return {
      l: parseFloat(oklch[1]) / (oklch[2] === '%' ? 100 : 1),
      // A chroma percentage is relative to 0.4 (100% = 0.4).
      c: parseFloat(oklch[3]) * (oklch[4] === '%' ? 0.004 : 1),
      h: parseFloat(oklch[5]),
    };
  }
  const rgba = parseRGBA(value);
  return rgba && rgba.a > 0 ? rgbaToOklch(normalizeRGBA(rgba)) : null;
};

//
// Internal.
//

const stripContentBackgrounds = (root: Element): void => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let el = walker.nextNode();
  while (el) {
    if (el instanceof HTMLElement) {
      const parsed = parseRGBA(getComputedStyle(el).backgroundColor);
      const rgba = parsed && normalizeRGBA(parsed);
      if (rgba && rgba.a > 0) {
        const oklch = rgbaToOklch(rgba);
        // Drop light page backgrounds (unless nested under a kept colored background), so the app
        // surface shows through; colored/dark backgrounds (buttons, banners) are preserved.
        if (oklch.l > LIGHT_BG_THRESHOLD && !hasOpaqueAncestorBackground(el, root)) {
          el.style.setProperty('background-color', 'transparent', 'important');
          el.removeAttribute('bgcolor');
        }
      }
    }
    el = walker.nextNode();
  }
};

// Parents are visited before children, so a remaining opaque ancestor bg is one we kept (non-light):
// a light bg layered on it is content (e.g. a button face), not page chrome, and must not be stripped.
const hasOpaqueAncestorBackground = (el: HTMLElement, root: Element): boolean => {
  let ancestor = el.parentElement;
  while (ancestor && ancestor !== root) {
    const parsed = parseRGBA(getComputedStyle(ancestor).backgroundColor);
    const bg = parsed && normalizeRGBA(parsed);
    if (bg && bg.a > 0) {
      return true;
    }
    ancestor = ancestor.parentElement;
  }
  return false;
};

const computeTextNodeColors = (root: Element): TextNodeContrast[] => {
  const out: TextNodeContrast[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => (node.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
  });

  let node = walker.nextNode() as Text | null;
  while (node) {
    const el = node.parentElement;
    if (el) {
      const style = getComputedStyle(el);
      const fgParsed = parseRGBA(style.color);
      const fg = fgParsed && rgbaToOklch(normalizeRGBA(fgParsed));

      // background-color doesn't inherit, so walk ancestors for the first opaque one.
      let bg: OKLCH | null = null;
      let bgEl: Element | null = el;
      while (bgEl && bgEl !== root) {
        const parsed = parseRGBA(getComputedStyle(bgEl).backgroundColor);
        const rgba = parsed && normalizeRGBA(parsed);
        if (rgba && rgba.a > 0) {
          bg = rgbaToOklch(rgba);
          break;
        }
        bgEl = bgEl.parentElement;
      }

      if (fg) {
        out.push({ fg, bg, node, insideAnchor: el.closest('a') !== null });
      }
    }
    node = walker.nextNode() as Text | null;
  }

  return out;
};

const findClosestContrastingColor = (fg: OKLCH, bgL: number): OKLCH => {
  const dir = fg.l > bgL ? 1 : -1;
  const candidate = bgL + dir * CONTRAST_THRESHOLD;
  const l = candidate >= 0 && candidate <= 1 ? candidate : bgL - dir * CONTRAST_THRESHOLD;
  return { l, c: fg.c, h: fg.h, a: fg.a ?? 1 };
};

const setNodeColor = (node: Node, color: string): void => {
  node.parentElement?.style.setProperty('color', color, 'important');
};

const parseRGBA = (color: string): RGBA | null => {
  if (!color) {
    return null;
  }
  const value = color.trim().toLowerCase();
  if (value === 'transparent') {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  const match = value.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)$/);
  if (!match) {
    return null;
  }
  return {
    r: parseFloat(match[1]),
    g: parseFloat(match[2]),
    b: parseFloat(match[3]),
    a: match[4] !== undefined ? parseFloat(match[4]) : 1,
  };
};

const normalizeRGBA = (rgba: RGBA): RGBA => {
  const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
  return { r: clamp01(rgba.r / 255), g: clamp01(rgba.g / 255), b: clamp01(rgba.b / 255), a: rgba.a };
};

/** sRGB (0–1 channels) → OKLCH. */
const rgbaToOklch = (rgba: RGBA): OKLCH => {
  const { r, g, b, a } = rgba;
  const linear = (component: number) =>
    component <= 0.04045 ? component / 12.92 : Math.pow((component + 0.055) / 1.055, 2.4);
  const lr = linear(r);
  const lg = linear(g);
  const lb = linear(b);

  const lCubed = lr * 0.4122214708 + lg * 0.5363325363 + lb * 0.0514459929;
  const mCubed = lr * 0.2119034982 + lg * 0.6806995451 + lb * 0.1073969566;
  const sCubed = lr * 0.0883024619 + lg * 0.2817188376 + lb * 0.6299787005;

  const okL = Math.cbrt(lCubed);
  const okM = Math.cbrt(mCubed);
  const okS = Math.cbrt(sCubed);

  const lightness = okL * 0.2104542553 + okM * 0.793617785 - okS * 0.0040720468;
  const aAxis = okL * 1.9779984951 - okM * 2.428592205 + okS * 0.4505937099;
  const bAxis = okL * 0.0259040371 + okM * 0.7827717662 - okS * 0.808675766;

  const chroma = Math.sqrt(aAxis * aAxis + bAxis * bAxis);
  const hueDeg = (Math.atan2(bAxis, aAxis) * 180) / Math.PI;

  return { l: lightness, c: chroma, h: hueDeg < 0 ? hueDeg + 360 : hueDeg, a };
};
