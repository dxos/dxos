//
// Copyright 2026 DXOS.org
//

// Kept out of `Html.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so helpers exported beside them force a full page reload on every edit.

/**
 * A rendering mode. Used for both the app's current mode and a document's declared support, so the two
 * are always comparable; `undefined` (never a sentinel string) means a document declared nothing.
 */
export type ColorScheme = 'light' | 'dark';

const META_COLOR_SCHEME_RE = /<meta[^>]+name=["']?(?:supported-)?color-scheme["']?[^>]*>/gi;
const CONTENT_RE = /content=["']([^"']*)["']/i;
const DARK_MEDIA_RE = /prefers-color-scheme\s*:\s*dark/i;

/**
 * Reads the document's color-scheme declaration from the **raw** markup. This cannot run after
 * sanitization: `meta` is a forbidden tag, so the declaration is gone by then. Not email-specific —
 * `color-scheme` and `prefers-color-scheme` are how any HTML document states its intent.
 */
export const detectColorScheme = (html: string): ColorScheme | undefined => {
  if (DARK_MEDIA_RE.test(html)) {
    return 'dark';
  }

  const declared = Array.from(html.matchAll(META_COLOR_SCHEME_RE))
    .map((match) => match[0].match(CONTENT_RE)?.[1]?.toLowerCase() ?? '')
    .join(' ');
  if (declared.includes('dark')) {
    return 'dark';
  }

  return declared.includes('light') ? 'light' : undefined;
};

/**
 * Makes the app theme — not the OS — decide whether the document's own dark rules apply.
 * `prefers-color-scheme` resolves against the user agent and cannot be overridden from the page, so the
 * rules are rewritten instead: in dark mode each dark block is re-scoped to `@media all` so it always
 * matches; in light mode it is deleted, so an OS-dark browser can't dark-render inside a light app.
 * Owning the shadow root's stylesheet is what makes this possible.
 *
 * Returns whether any dark block was found. A document can *declare* dark support whose rules never
 * reach us (sanitization strips `<style>`), and a caller needs to tell those apart to decide whether
 * the sender's design is actually on screen or it needs its own fallback.
 */
export const applyAuthoredDarkRules = (root: HTMLElement, mode: ColorScheme): boolean => {
  let found = false;
  for (const style of root.querySelectorAll('style')) {
    const sheet = style.sheet;
    if (!sheet) {
      continue;
    }

    // Backwards: deleting/inserting shifts every later index.
    for (let index = sheet.cssRules.length - 1; index >= 0; index--) {
      const rule = sheet.cssRules[index];
      if (!(rule instanceof CSSMediaRule) || !DARK_MEDIA_RE.test(rule.conditionText)) {
        continue;
      }

      const inner = Array.from(rule.cssRules)
        .map((cssRule) => cssRule.cssText)
        .join('');
      found = true;
      sheet.deleteRule(index);
      if (mode === 'dark' && inner) {
        sheet.insertRule(`@media all{${inner}}`, index);
      }
    }
  }

  return found;
};
