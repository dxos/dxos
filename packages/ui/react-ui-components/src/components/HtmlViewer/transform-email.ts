//
// Copyright 2026 DXOS.org
//

import { Domino } from '@dxos/ui';

import { type HtmlDialect, type HtmlSrcResolver, type HtmlTransform, applyAuthoredDarkRules } from './Html';
import { type ThemeColorParams, cssColorToOklch, processEmailColors } from './transform-colors';

// Email-specific rules layered on the sandbox's base CSS.
const EMAIL_CSS = [
  // Links take the app accent so authored link colors don't render illegibly against the app surface —
  // even for emails not otherwise recolored. The accent token is referenced directly: custom properties
  // inherit across the shadow boundary and resolve in the shadow's render context (correct light/dark).
  // Button-style links (own background) are excluded so their design is preserved.
  'a:not([data-dx-email-btn]),a:not([data-dx-email-btn]) *{color:var(--color-accent-text,#3b82f6)!important;',
  'text-decoration-color:var(--color-accent-text,#3b82f6)!important;}',
  // Quoted reply history is collapsed behind a toggle (see collapseQuotedReply).
  '.dx-email-quote{display:none;}',
  '.dx-email-quote.dx-email-quote-open{display:block;}',
  '.dx-email-quote-toggle{display:inline-flex;align-items:center;justify-content:center;gap:3px;',
  'margin:8px 0;min-width:34px;height:20px;padding:0 8px;border:0;border-radius:10px;cursor:pointer;',
  'font:inherit;font-size:13px;line-height:1;letter-spacing:1px;color:inherit;',
  'background:color-mix(in oklab, currentColor 16%, transparent);}',
  '.dx-email-quote-toggle:hover{background:color-mix(in oklab, currentColor 28%, transparent);}',
  // `Domino.svg` sizes the icon with Tailwind utilities, which do not cross the shadow boundary — the
  // app's stylesheet is not in this root — so the sprite is sized here instead.
  '.dx-email-quote-toggle svg{width:1em;height:1em;flex-shrink:0;fill:currentColor;}',
  // Normalizes typography to the app font so themed mail reads natively. Gated on the class the theming
  // transform adds, so a body left as authored keeps its own type.
  '.dx-email-themed *:not(code):not(pre):not(code *):not(pre *){font-family:inherit!important;line-height:1.5!important;}',
].join('');

// Wrappers email clients use for quoted reply/forward history (the content that follows "On … wrote:").
const QUOTE_SELECTORS = [
  '.gmail_quote_container',
  '.gmail_quote',
  '.protonmail_quote',
  '.yahoo_quoted',
  '#appendonsend',
  '#divRplyFwdMsg',
  'blockquote[type="cite"]',
].join(',');

/** The shadow host, which survives content rebuilds — where transform state outlives a re-parse. */
const getHost = (root: HTMLElement): HTMLElement | undefined => {
  const shadow = root.getRootNode();
  return shadow instanceof ShadowRoot ? (shadow.host as HTMLElement) : undefined;
};

/**
 * Collapses quoted reply/forward history behind an ellipsis toggle (like every email client): the first
 * quote wrapper and everything after it is hidden until the toggle is clicked. No-op when there's no
 * quote.
 *
 * The open state is stored on the host element rather than in React, because the content is re-parsed
 * on every rebuild (a theme change, say) while the host persists — so an opened quote stays open
 * without the dialect needing to be stateful.
 */
const collapseQuotedReply: HtmlTransform = (root) => {
  const quote = root.querySelector<HTMLElement>(QUOTE_SELECTORS);
  const parent = quote?.parentElement;
  if (!quote || !parent) {
    return;
  }

  const host = getHost(root);
  const open = host?.dataset.dxEmailQuoteOpen === 'true';
  const region = Domino.of('div').classNames(['dx-email-quote', open && 'dx-email-quote-open']).root;

  // Inserted rather than mounted: the region takes the quote's place among its siblings.
  parent.insertBefore(region, quote);
  // Move the quote and any trailing siblings (further quoted history) into the collapsible region.
  for (let node = region.nextSibling; node; node = region.nextSibling) {
    region.appendChild(node);
  }

  const toggle = Domino.of('button')
    .classNames('dx-email-quote-toggle')
    .attributes({ 'type': 'button', 'aria-label': 'Show quoted text' })
    .append(Domino.svg('ph--dots-three--bold'))
    .on('click', () => {
      const expanded = region.classList.toggle('dx-email-quote-open');
      if (host) {
        host.dataset.dxEmailQuoteOpen = String(expanded);
      }
    }).root;

  parent.insertBefore(toggle, region);
};

/** Opens links in a new tab. */
const markLinks: HtmlTransform = (root) => {
  for (const anchor of root.querySelectorAll('a')) {
    anchor.setAttribute('target', '_blank');
    anchor.setAttribute('rel', 'noopener noreferrer');
  }
};

/** Whether anything from `element` up to `root` paints an opaque background behind it. */
const sitsOnPaintedBackground = (element: Element, root: Element): boolean => {
  for (let node: Element | null = element; node && node !== root.parentElement; node = node.parentElement) {
    const parsed = /rgba?\(([^)]+)\)/.exec(getComputedStyle(node).backgroundColor);
    const alpha = parsed ? Number(parsed[1].split(/[,/]/)[3] ?? '1') : 0;
    if (alpha > 0) {
      return true;
    }
    if (node === root) {
      break;
    }
  }

  return false;
};

/**
 * Exempts links sitting on a sender-painted background from the accent-color override, so a call to
 * action keeps the contrast its author designed.
 *
 * Checking the anchor's own inline background is not enough: the near-universal email button is a
 * painted `<td>`/`<div>` wrapping a bare `<a>`, which would otherwise have its white label rewritten
 * to the app accent — blue on blue. This mirrors the recolor policy, which likewise leaves text alone
 * once the sender painted something behind it.
 *
 * Runs after theming, so it sees the backgrounds that actually survived `stripContentBackgrounds` —
 * a link whose light background was dropped is back on the app surface and does want the accent.
 */
const markButtonLinks: HtmlTransform = (root) => {
  for (const anchor of root.querySelectorAll('a')) {
    if (sitsOnPaintedBackground(anchor, root)) {
      anchor.setAttribute('data-dx-email-btn', '');
    }
  }
};

/**
 * Resolves the app theme's ink/surface tokens (OKLCH) via a probe inside the (attached) container.
 * Read from the shadow's own render context so the tokens resolve to the correct light/dark values.
 */
const readThemeParams = (container: Element): ThemeColorParams | undefined => {
  const probe = Domino.of('span').style({ display: 'none' }).mount(container).root;
  const resolve = (variable: string) => {
    probe.style.color = `var(${variable})`;
    return cssColorToOklch(getComputedStyle(probe).color);
  };
  const ink = resolve('--color-base-fg');
  const panel = resolve('--color-base-surface');
  container.removeChild(probe);

  return ink && panel
    ? {
        inkL: ink.l,
        inkC: ink.c,
        inkH: ink.h,
        panelL: panel.l,
      }
    : undefined;
};

/**
 * The light/dark policy. Only one thing earns an exemption from recoloring: a sender's own dark design
 * that is actually on screen. Everything else is recolored to the app theme, whatever it declared and
 * whatever its layout — a body rendering as a white sheet inside a dark app is not a dark mode, and a
 * `color-scheme: light` declaration says the sender has no dark design of their own, not that ours is
 * unwelcome.
 *
 * Dropping the old table-layout exemption cost little: it was there to preserve bulk-mail *design*,
 * but sanitization strips `<style>` (DESIGN.md §2), so it only ever preserved inline styles and table
 * structure. Intentional colored backgrounds still survive either way — `stripContentBackgrounds`
 * drops only *light* ones.
 */
const themeBody: HtmlTransform = (root, { colorScheme, mode }) => {
  // Rewrites the sender's `prefers-color-scheme` blocks so the app theme, not the OS, decides them.
  // Reports whether any actually arrived: a document can declare dark support whose rules sanitization
  // removed, and that body still needs recoloring or it renders light inside a dark app.
  const adopted = colorScheme === 'dark' && applyAuthoredDarkRules(root, mode);
  if (adopted && mode === 'dark') {
    return;
  }

  root.classList.add('dx-email-themed');
  const params = readThemeParams(root);
  if (params) {
    processEmailColors(root, params);
  }
};

export type EmailDialectOptions = {
  /** Resolves `cid:` (RFC 2392) inline attachments. Supplied by the caller, which owns the data layer. */
  resolveSrc?: HtmlSrcResolver;
};

/**
 * The email dialect for `Html`: quoted-reply collapse, link handling, `cid:` resolution, and the
 * light/dark policy.
 *
 * A plain function, not a hook — nothing here is stateful. Transform state lives on the host element
 * and the color scheme arrives in the transform context, so a caller builds this inline on every
 * render; `Html` keys rebuilds on `key`, not on identity.
 */
export const emailDialect = ({ resolveSrc }: EmailDialectOptions = {}): HtmlDialect => ({
  // Constant: the dialect's behaviour no longer varies by option, only by what the document declares —
  // which the base already tracks (`colorScheme`) and keys rebuilds on.
  key: 'email',
  css: EMAIL_CSS,
  transforms: [markLinks, collapseQuotedReply, themeBody, markButtonLinks],
  resolveSrc,
});
