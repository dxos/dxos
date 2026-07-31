//
// Copyright 2026 DXOS.org
//

import { useMemo, useRef } from 'react';

import { useThemeContext } from '@dxos/react-ui';

import { type HtmlDialect, type HtmlSrcResolver, type HtmlTransform } from './Html';
import { type ThemeColorParams, cssColorToOklch, processEmailColors } from './transform-colors';

// Email-specific rules layered on the sandbox's base CSS.
const EMAIL_CSS = [
  // Links take the app accent so authored link colors don't render illegibly against the app surface —
  // even for emails not otherwise recolored. The accent token is referenced directly: custom properties
  // inherit across the shadow boundary and resolve in the shadow's render context (correct light/dark).
  // Button-style links (own background) are excluded so their design is preserved.
  'a:not([data-dx-email-btn]),a:not([data-dx-email-btn]) *{color:var(--color-accent-text,#3b82f6)!important;',
  'text-decoration-color:var(--color-accent-text,#3b82f6)!important;}',
  // Quoted reply history is collapsed behind a "•••" toggle (see collapseQuotedReply).
  '.dx-email-quote{display:none;}',
  '.dx-email-quote.dx-email-quote-open{display:block;}',
  '.dx-email-quote-toggle{display:inline-flex;align-items:center;justify-content:center;gap:3px;',
  'margin:8px 0;min-width:34px;height:20px;padding:0 8px;border:0;border-radius:10px;cursor:pointer;',
  'font:inherit;font-size:13px;line-height:1;letter-spacing:1px;color:inherit;',
  'background:color-mix(in oklab, currentColor 16%, transparent);}',
  '.dx-email-quote-toggle:hover{background:color-mix(in oklab, currentColor 28%, transparent);}',
  // Normalizes typography to the app font so themed mail reads natively. Gated on the class the theming
  // transform adds, because the decision needs the parsed content (the table test).
  '.dx-email-themed *:not(code):not(pre):not(code *):not(pre *){font-family:inherit!important;line-height:1.5!important;}',
  // A body we deliberately do not recolor renders on its own light sheet rather than half-transparent
  // over a dark app surface. `color-scheme` keeps UA-rendered widgets light to match.
  '.dx-email-paper{background:#fff;color:#111;color-scheme:light;padding:8px;border-radius:4px;}',
].join('');

// Wrappers email clients use for quoted reply/forward history (the content that follows "On … wrote:").
const QUOTE_SELECTORS = [
  '.gmail_quote_container',
  '.gmail_quote',
  'blockquote[type="cite"]',
  '.protonmail_quote',
  '.yahoo_quoted',
  '#appendonsend',
  '#divRplyFwdMsg',
].join(',');

/**
 * What the sender said about color schemes:
 * - `dark` — ships its own dark rendering (a `prefers-color-scheme: dark` block, or a declaration
 *   naming `dark`). Adopt it rather than recoloring.
 * - `light` — explicitly states it has no dark rendering. An instruction not to try.
 * - `unknown` — said nothing; fall back to the layout heuristic.
 */
export type ColorScheme = 'dark' | 'light' | 'unknown';

const META_COLOR_SCHEME_RE = /<meta[^>]+name=["']?(?:supported-)?color-scheme["']?[^>]*>/gi;
const CONTENT_RE = /content=["']([^"']*)["']/i;
const DARK_MEDIA_RE = /prefers-color-scheme\s*:\s*dark/i;

/**
 * Reads the sender's color-scheme declaration from the **raw** markup. This cannot run after
 * sanitization: `meta` is in the sandbox's forbidden tags, so the declaration is gone by then.
 */
export const detectColorScheme = (html: string): ColorScheme => {
  if (DARK_MEDIA_RE.test(html)) {
    return 'dark';
  }

  const declared = Array.from(html.matchAll(META_COLOR_SCHEME_RE))
    .map((match) => match[0].match(CONTENT_RE)?.[1]?.toLowerCase() ?? '')
    .join(' ');
  if (declared.includes('dark')) {
    return 'dark';
  }

  return declared.includes('light') ? 'light' : 'unknown';
};

/**
 * Makes the app theme — not the OS — decide whether the sender's dark rules apply. `prefers-color-scheme`
 * resolves against the user agent and cannot be overridden from the page, so the rules are rewritten
 * instead: in dark mode each dark block is re-scoped to `@media all` so it always matches; in light mode
 * it is deleted so an OS-dark browser can't dark-render inside a light app. Operates on the parsed sheet
 * of each sender `<style>`, which is available because transforms run after the content is attached.
 */
const applyAuthoredDarkRules = (content: HTMLElement, dark: boolean): void => {
  for (const style of content.querySelectorAll('style')) {
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
      sheet.deleteRule(index);
      if (dark && inner) {
        sheet.insertRule(`@media all{${inner}}`, index);
      }
    }
  }
};

/**
 * Collapses quoted reply/forward history behind a "•••" toggle (like every email client): the first
 * quote wrapper and everything after it is hidden until the toggle is clicked. `expanded` persists the
 * open state across re-renders (e.g. theme changes rebuild the content). No-op when there's no quote.
 */
const collapseQuotedReply = (content: HTMLElement, expanded: { current: boolean }): void => {
  const quote = content.querySelector<HTMLElement>(QUOTE_SELECTORS);
  const parent = quote?.parentElement;
  if (!quote || !parent) {
    return;
  }

  const region = document.createElement('div');
  region.className = 'dx-email-quote';
  parent.insertBefore(region, quote);
  // Move the quote and any trailing siblings (further quoted history) into the collapsible region.
  for (let node = region.nextSibling; node; node = region.nextSibling) {
    region.appendChild(node);
  }
  if (expanded.current) {
    region.classList.add('dx-email-quote-open');
  }

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'dx-email-quote-toggle';
  toggle.textContent = '•••';
  toggle.setAttribute('aria-label', 'Show quoted text');
  parent.insertBefore(toggle, region);
  toggle.addEventListener('click', () => {
    expanded.current = region.classList.toggle('dx-email-quote-open');
  });
};

/** Opens links in a new tab; marks button-style links (own background) so the accent rule skips them. */
const markLinks: HtmlTransform = (content) => {
  for (const anchor of content.querySelectorAll('a')) {
    anchor.setAttribute('target', '_blank');
    anchor.setAttribute('rel', 'noopener noreferrer');
    if (anchor.style.backgroundColor) {
      anchor.setAttribute('data-dx-email-btn', '');
    }
  }
};

/**
 * Resolves the app theme's ink/surface tokens (OKLCH) via a probe inside the (attached) container.
 * Read from the shadow's own render context so the tokens resolve to the correct light/dark values.
 */
const readThemeParams = (container: Element): ThemeColorParams | undefined => {
  const probe = document.createElement('span');
  probe.style.display = 'none';
  container.appendChild(probe);
  const resolve = (variable: string) => {
    probe.style.color = `var(${variable})`;
    return cssColorToOklch(getComputedStyle(probe).color);
  };
  const ink = resolve('--color-base-fg');
  const panel = resolve('--color-base-surface');
  container.removeChild(probe);

  return ink && panel ? { inkL: ink.l, inkC: ink.c, inkH: ink.h, panelL: panel.l } : undefined;
};

export type UseEmailDialectProps = {
  /** The raw (pre-sanitize) body — the color-scheme declaration only survives here. */
  html: string;
  /**
   * Person-to-person mail (vs bulk/marketing). Personal mail is recolored to the app theme regardless
   * of layout; otherwise only simple (non-table) bodies are, so marketing layouts keep their design.
   */
  isPersonal?: boolean;
  /** Resolves `cid:` (RFC 2392) inline attachments. Supplied by the caller, which owns the data layer. */
  resolveSrc?: HtmlSrcResolver;
};

/**
 * The email dialect for {@link Html}: quoted-reply collapse, link handling, `cid:` resolution, and the
 * light/dark policy.
 *
 * The policy has three branches, because the sender's declaration is three-way and only one of them is
 * a guess:
 * 1. Ships dark rules → adopt them (see {@link applyAuthoredDarkRules}); never recolor over the
 *    sender's own dark design.
 * 2. Declares light only → the sender says it has no dark rendering; put it on a light sheet rather
 *    than recoloring against their wishes.
 * 3. Says nothing → the layout heuristic: recolor simple/personal bodies, leave table layouts as
 *    authored (on a light sheet in dark mode, so they aren't half-transparent over a dark surface).
 */
export const useEmailDialect = ({ html, isPersonal = false, resolveSrc }: UseEmailDialectProps): HtmlDialect => {
  const { themeMode } = useThemeContext();
  // Persists the quoted-reply expand state across rebuilds (a theme change re-parses the content).
  const quoteExpandedRef = useRef(false);
  const colorScheme = useMemo(() => detectColorScheme(html), [html]);

  const transforms = useMemo<HtmlTransform[]>(() => {
    const dark = themeMode === 'dark';
    return [
      markLinks,
      (content) => collapseQuotedReply(content, quoteExpandedRef),
      (content) => {
        if (colorScheme === 'dark') {
          applyAuthoredDarkRules(content, dark);
          return;
        }

        const recolor = colorScheme !== 'light' && (isPersonal || content.querySelector('table') === null);
        if (!recolor) {
          if (dark) {
            content.classList.add('dx-email-paper');
          }
          return;
        }

        content.classList.add('dx-email-themed');
        const params = readThemeParams(content);
        if (params) {
          processEmailColors(content, params);
        }
      },
    ];
  }, [colorScheme, isPersonal, themeMode]);

  return useMemo(() => ({ css: EMAIL_CSS, transforms, resolveSrc }), [transforms, resolveSrc]);
};
