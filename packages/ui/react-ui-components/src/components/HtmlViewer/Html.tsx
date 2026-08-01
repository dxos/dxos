//
// Copyright 2026 DXOS.org
//

import DOMPurify from 'dompurify';
import React, { useEffect, useMemo, useRef } from 'react';

import { type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

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

/** What the sandbox knows about the document, handed to every transform so a dialect stays pure. */
export type HtmlTransformContext = {
  /** What the document declared, read before sanitization stripped it; `undefined` if it said nothing. */
  colorScheme: ColorScheme | undefined;
  /** The mode the app (not the OS) is rendering in. */
  mode: ColorScheme;
};

/**
 * Mutates the attached content subtree. Runs after the content is in the shadow root, so a transform
 * may read layout/computed style. Called in order on every rebuild, so a transform must be idempotent
 * over a freshly-parsed subtree; state that has to outlive a rebuild belongs on the host element
 * (reachable via `root.getRootNode().host`), which persists.
 */
export type HtmlTransform = (root: HTMLElement, context: HtmlTransformContext) => void;

/**
 * Resolves a non-http `src` (e.g. `cid:`) to a URL. Returning `undefined` leaves the element alone.
 * Resolution is asynchronous, so matches are swapped in place once resolved rather than blocking the
 * synchronous content attach.
 */
export type HtmlSrcResolver = (src: string) => Promise<string | undefined>;

/**
 * Everything a kind of content needs beyond the sandbox itself — how email, RSS, a web clip, or
 * agent-produced markup differ. A plain value, deliberately: not a subclass, and not a `variant` enum
 * (which would put every dialect's knowledge back inside this component).
 *
 * Callers may build one inline on every render. Rebuilds are keyed on {@link HtmlDialect.key}, not on
 * the identity of these functions, so a dialect needs no memoization to avoid re-parsing the document.
 */
export type HtmlDialect = {
  /**
   * Identifies this dialect *configuration*. Rebuild the content when it changes — so it must capture
   * every option that changes what the transforms do. Omit for a dialect whose behaviour never varies —
   * as the email dialect now is, since only the document's own declaration steers it.
   */
  key?: string;
  /** Extra CSS injected into the shadow root, after the base rules. */
  css?: string;
  /** Content transforms, applied in order once the content is attached. */
  transforms?: readonly HtmlTransform[];
  /** Resolves non-http `src` values (inline attachments, blob refs, …). */
  resolveSrc?: HtmlSrcResolver;
  /** Tags removed during sanitization, on top of DOMPurify's defaults. */
  forbidTags?: readonly string[];
};

export type HtmlProps = ThemedClassName<{
  html: string;
  /** When false (default), remote image `src`s are stripped so tracking pixels don't load. */
  loadRemoteImages?: boolean;
  dialect?: HtmlDialect;
}>;

/** Tags that execute or phone home; a shadow root isolates style, not script. */
const DEFAULT_FORBID_TAGS = ['script', 'iframe', 'object', 'embed', 'form', 'link', 'meta', 'base'];

// Inheritable properties (font, color) cross the shadow boundary from the host, so unstyled content
// already picks up the app's typography/foreground.
const BASE_CSS = [
  ':host{display:block;}',
  '.dx-html-root{overflow-wrap:anywhere;word-break:break-word;}',
  'img{max-width:100%!important;height:auto!important;}',
  'table{max-width:100%;}',
  'pre.dx-plain{white-space:pre-wrap;font-family:inherit;margin:0;}',
  // An <img> we will not load must not draw the browser's broken-image placeholder (and, inside a
  // link, leave its alt text sitting there underlined). Removing `src` alone is not enough.
  'img[data-dx-hidden]{display:none!important;}',
].join('');

/**
 * Whether loading this `src` would hit the network. Protocol-relative (`//host/…`) counts: it is a
 * remote fetch, and matching only `https?:` would let a tracking pixel through.
 */
const isNetworkSrc = (src: string): boolean => /^(https?:)?\/\//i.test(src);

/** Inline payloads — already in the document, so nothing is fetched. */
const isInlineSrc = (src: string): boolean => /^(data|blob):/i.test(src);

/**
 * Strips remote `url(…)` references from an inline `style` attribute.
 *
 * DOMPurify does not parse CSS, so a `background-image` survives sanitization untouched and fetches on
 * render — blocking only `<img>` would leave a tracking pixel one CSS property away. `<style>` blocks
 * are dropped wholesale by sanitization, so inline attributes are the only remaining carrier.
 */
const stripRemoteCssUrls = (element: Element): void => {
  const style = element.getAttribute('style');
  if (!style || !/url\(/i.test(style)) {
    return;
  }

  const stripped = style.replace(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi, (match, url: string) =>
    isNetworkSrc(url) ? 'none' : match,
  );
  if (stripped !== style) {
    element.setAttribute('style', stripped);
    element.setAttribute('data-dx-blocked-css', '');
  }
};

/**
 * Marks an image as not-to-be-rendered. `blockedSrc` preserves the original so a caller can offer to
 * load it later; the element stays in the DOM so enabling images can restore it in place.
 */
const hideImage = (img: Element, blockedSrc?: string): void => {
  if (blockedSrc) {
    img.setAttribute('data-dx-blocked-src', blockedSrc);
  }
  img.setAttribute('data-dx-hidden', '');
  img.removeAttribute('src');
};

/** Escapes text so a non-HTML payload can be shown verbatim. */
const escapeHtml = (text: string): string => text.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

/**
 * Whether the payload is markup rather than plain text. Deliberately conservative — a bare `<` in
 * prose ("a < b") must not be mistaken for markup and lose its `<pre>` treatment — so it requires a
 * recognized tag. Mirrors `@dxos/markdown`'s `isHtml`, without taking the dependency.
 */
const isMarkup = (text: string): boolean =>
  /<(\/?(p|div|span|ul|ol|li|a|strong|em|br|table|tr|td|h[1-6]))\b[^>]*>/i.test(text);

/**
 * Renders untrusted HTML inside a Shadow DOM host so the content's (often aggressive) CSS is isolated
 * from the app while it still flows in the app layout — no iframe, no height measurement. Script
 * safety comes from DOMPurify sanitization, since a shadow root isolates style but does not sandbox
 * execution; remote images are stripped unless enabled, so tracking pixels don't load.
 *
 * Content-specific behaviour is supplied by the caller as a {@link HtmlDialect}: `transforms` mutate
 * the attached subtree (collapsing quoted replies, recoloring to the theme, …) and `resolveSrc`
 * resolves non-http `src` references. This component owns only the sandbox.
 */
export const Html = ({ html, loadRemoteImages = false, dialect, classNames }: HtmlProps) => {
  const { themeMode } = useThemeContext();
  const hostRef = useRef<HTMLDivElement>(null);
  // Resolved src cache, persisted across content rebuilds; blob: urls are revoked on unmount.
  const srcCacheRef = useRef<Map<string, string>>(new Map());
  // Resolution is async, so a promise can settle after unmount — past the cleanup that would have
  // revoked its url. The flag lets the late completion revoke its own.
  const disposedRef = useRef(false);
  // Read at rebuild time rather than depended on, so an inline (unmemoized) dialect doesn't re-parse
  // the document on every render. `key` is what declares a rebuild is actually needed.
  const dialectRef = useRef(dialect);
  dialectRef.current = dialect;

  useEffect(
    () => () => {
      disposedRef.current = true;
      for (const url of srcCacheRef.current.values()) {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      }
      srcCacheRef.current.clear();
    },
    [],
  );

  const forbidTags = dialect?.forbidTags;
  const forbidTagsKey = forbidTags?.join(',') ?? '';
  const sanitized = useMemo(
    () =>
      isMarkup(html)
        ? DOMPurify.sanitize(html, { FORBID_TAGS: [...DEFAULT_FORBID_TAGS, ...(forbidTags ?? [])] })
        : `<pre class="dx-plain">${escapeHtml(html)}</pre>`,
    // `forbidTagsKey` stands in for the array, which callers may rebuild inline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [html, forbidTagsKey],
  );

  // Read before sanitization strips the declaration.
  const colorScheme = useMemo(() => detectColorScheme(html), [html]);

  const css = dialect?.css;
  const dialectKey = dialect?.key;
  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });

    const content = document.createElement('div');
    content.className = 'dx-html-root';
    content.innerHTML = sanitized;

    // CSS can fetch too: a remote `background-image` in an inline style would load even with every
    // `<img>` blocked.
    if (!loadRemoteImages) {
      for (const element of content.querySelectorAll('[style]')) {
        stripRemoteCssUrls(element);
      }
    }

    // Decide what each image may render. Remote fetches are blocked until the user opts in (privacy);
    // anything left with a src nobody can resolve is hidden rather than drawn broken.
    for (const img of content.querySelectorAll('img')) {
      const src = img.getAttribute('src');
      if (!src) {
        hideImage(img);
      } else if (isNetworkSrc(src)) {
        if (!loadRemoteImages) {
          hideImage(img, src);
        }
      } else if (!isInlineSrc(src) && !dialectRef.current?.resolveSrc) {
        // e.g. a `cid:` attachment in a context with no resolver.
        hideImage(img);
      }
    }

    const style = document.createElement('style');
    style.textContent = BASE_CSS + (css ?? '');
    shadow.replaceChildren(style, content);

    // Attached first: transforms may read `getComputedStyle`, which needs the subtree in the document.
    const context: HtmlTransformContext = { colorScheme, mode: themeMode === 'dark' ? 'dark' : 'light' };
    for (const transform of dialectRef.current?.transforms ?? []) {
      transform(content, context);
    }

    const resolveSrc = dialectRef.current?.resolveSrc;
    if (resolveSrc) {
      resolvePendingSrc(content, resolveSrc, srcCacheRef.current, () => disposedRef.current);
    }
  }, [sanitized, loadRemoteImages, css, dialectKey, colorScheme, themeMode]);

  return <div ref={hostRef} className={mx('w-full', classNames)} />;
};

Html.displayName = 'Html';

/**
 * Swaps each unresolved (non-http, non-data) `src` in place once the caller's resolver returns.
 *
 * `isDisposed` closes a leak on unmount: the resolver may settle after the cleanup that revokes cached
 * urls, and a `blob:` minted then would be cached into a map nobody visits again. A late completion
 * revokes its own url instead.
 */
const resolvePendingSrc = (
  content: HTMLElement,
  resolveSrc: HtmlSrcResolver,
  cache: Map<string, string>,
  isDisposed: () => boolean,
): void => {
  for (const img of content.querySelectorAll('img')) {
    const src = img.getAttribute('src');
    if (!src || /^(https?|data|blob):/i.test(src)) {
      continue;
    }

    const cached = cache.get(src);
    if (cached) {
      img.setAttribute('src', cached);
      continue;
    }

    // Both outcomes hide: a rejected resolver (a failed lookup) must not leave an unhandled rejection,
    // and must not leave the unresolved src to render broken either.
    void resolveSrc(src).then(
      (url) => {
        if (!url) {
          hideImage(img);
          return;
        }
        if (isDisposed()) {
          if (url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
          }
          return;
        }

        cache.set(src, url);
        img.setAttribute('src', url);
      },
      () => hideImage(img),
    );
  }
};
