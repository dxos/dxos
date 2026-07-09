//
// Copyright 2026 DXOS.org
//

import DOMPurify from 'dompurify';
import React, { useEffect, useMemo, useRef } from 'react';

import { isHtml } from '@dxos/markdown';
import { type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { type ThemeColorParams, cssColorToOklch, processEmailColors } from './transform-colors';

export type HtmlViewerProps = ThemedClassName<{
  html: string;
  /** When false (default), remote image `src`s are stripped so tracking pixels don't load. */
  loadRemoteImages?: boolean;
  /**
   * Person-to-person mail (vs bulk/marketing). Personal mail is always recolored/refonted to the app
   * theme; otherwise only simple (non-table) bodies are, so marketing layouts keep their design.
   */
  isPersonal?: boolean;
}>;

// Base styles injected into the shadow root. Inheritable props (font, color) cross the shadow boundary
// from the host, so unstyled email text already picks up the app's typography/foreground.
const BASE_CSS = [
  ':host{display:block;}',
  '.dx-email-root{padding:8px 16px;overflow-wrap:anywhere;word-break:break-word;}',
  'img{max-width:100%!important;height:auto!important;}',
  'table{max-width:100%;}',
  'pre.dx-plain{white-space:pre-wrap;font-family:inherit;margin:0;}',
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

// For simple (non-table) emails, normalize typography to the app font so personal mail reads natively.
const FONT_CSS =
  '.dx-email-root *:not(code):not(pre):not(code *):not(pre *){font-family:inherit!important;line-height:1.5!important;}';

/** Escapes text so a plaintext body can be shown verbatim. */
const escapeHtml = (text: string): string => text.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

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

/**
 * Renders email HTML inside a Shadow DOM host so the email's (often aggressive) CSS is isolated from
 * the app while the content still flows in the app layout (no iframe / height measurement). Script
 * safety comes from DOMPurify sanitization — a shadow root does not sandbox execution — and remote
 * images are stripped unless enabled. For simple (non-table) emails the content is recolored to the
 * app theme (see {@link processEmailColors}) so it "fits" light/dark; table-heavy marketing emails are
 * left as authored to preserve their layout. Modeled on macro-inc/macro's email renderer.
 */
export const HtmlViewer = ({ html, loadRemoteImages = false, isPersonal = false, classNames }: HtmlViewerProps) => {
  const { themeMode } = useThemeContext();
  const hostRef = useRef<HTMLDivElement>(null);
  // Persists the quoted-reply expand state across re-renders (theme changes rebuild the shadow content).
  const quoteExpandedRef = useRef(false);

  const sanitized = useMemo(
    () =>
      isHtml(html)
        ? DOMPurify.sanitize(html, {
            FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'link', 'meta', 'base'],
          })
        : `<pre class="dx-plain">${escapeHtml(html)}</pre>`,
    [html],
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }
    const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });

    const content = document.createElement('div');
    content.className = 'dx-email-root';
    content.innerHTML = sanitized;

    // Open links in a new tab; mark button-style links (own background) so the accent rule skips them.
    for (const anchor of content.querySelectorAll('a')) {
      anchor.setAttribute('target', '_blank');
      anchor.setAttribute('rel', 'noopener noreferrer');
      if (anchor.style.backgroundColor) {
        anchor.setAttribute('data-dx-email-btn', '');
      }
    }

    // Collapse quoted reply/forward history behind a toggle.
    collapseQuotedReply(content, quoteExpandedRef);

    // Block remote images (privacy) by removing their src until the user opts in.
    if (!loadRemoteImages) {
      for (const img of content.querySelectorAll('img')) {
        const src = img.getAttribute('src');
        if (src && /^https?:/i.test(src)) {
          img.setAttribute('data-dx-blocked-src', src);
          img.removeAttribute('src');
        }
      }
    }

    // Personal mail is themed regardless of layout; otherwise only simple (non-table) bodies are, so
    // marketing emails keep their brand design.
    const hasTable = content.querySelector('table') !== null;
    const shouldTheme = isPersonal || !hasTable;
    const style = document.createElement('style');
    style.textContent = BASE_CSS + (shouldTheme ? FONT_CSS : '');
    shadow.replaceChildren(style, content);

    // Recolor to the theme once attached (the transform reads `getComputedStyle`). Theme params are
    // resolved via a probe inside the shadow, where tokens resolve in the correct light/dark context.
    if (shouldTheme) {
      const params = readThemeParams(content);
      if (params) {
        processEmailColors(content, params);
      }
    }
  }, [sanitized, loadRemoteImages, isPersonal, themeMode]);

  return <div ref={hostRef} className={mx('is-full', classNames)} />;
};

/** Resolves the app theme's ink/surface tokens (OKLCH) via a probe inside the (attached) container. */
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
