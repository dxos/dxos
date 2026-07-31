//
// Copyright 2026 DXOS.org
//

import DOMPurify from 'dompurify';
import React, { useEffect, useMemo, useRef } from 'react';

import { type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

/**
 * Mutates the attached content subtree. Runs after the content is in the shadow root, so a transform
 * may read layout/computed style. Called in order on every rebuild (content or theme change), so a
 * transform must be idempotent over a freshly-parsed subtree rather than accumulate state.
 */
export type HtmlTransform = (root: HTMLElement) => void;

/**
 * Resolves a non-http `src` (e.g. `cid:`) to a URL. Returning `undefined` leaves the element alone.
 * Resolution is asynchronous, so matches are swapped in place once resolved rather than blocking the
 * synchronous content attach.
 */
export type HtmlSrcResolver = (src: string) => Promise<string | undefined>;

/**
 * Everything a kind of content needs beyond the sandbox itself. `Html` is fixed; a dialect is how
 * email, RSS, a web clip, or agent-produced markup differ — so this is a value, not a subclass and not
 * a `variant` enum (which would put every dialect's knowledge back inside the shared component).
 *
 * A dialect usually holds React state (expand refs, memoized resolvers), so it is built by a hook —
 * see {@link useEmailDialect} — rather than declared as a constant.
 */
export type HtmlDialect = {
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
].join('');

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
 * Content-specific behaviour is supplied by the caller: `transforms` mutate the attached subtree
 * (collapsing quoted replies, recoloring to the theme, …) and `resolveSrc` resolves non-http `src`
 * references. This component owns only the sandbox.
 */
export const Html = ({ html, loadRemoteImages = false, dialect, classNames }: HtmlProps) => {
  const { css, transforms, resolveSrc, forbidTags } = dialect ?? {};
  // Rebuilt on theme change so transforms that read theme tokens (via computed style) re-run.
  const { themeMode } = useThemeContext();
  const hostRef = useRef<HTMLDivElement>(null);
  // Resolved src cache, persisted across content rebuilds; blob: urls are revoked on unmount.
  const srcCacheRef = useRef<Map<string, string>>(new Map());

  useEffect(
    () => () => {
      for (const url of srcCacheRef.current.values()) {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      }
    },
    [],
  );

  const sanitized = useMemo(
    () =>
      isMarkup(html)
        ? DOMPurify.sanitize(html, { FORBID_TAGS: [...DEFAULT_FORBID_TAGS, ...(forbidTags ?? [])] })
        : `<pre class="dx-plain">${escapeHtml(html)}</pre>`,
    [html, forbidTags],
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }
    const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });

    const content = document.createElement('div');
    content.className = 'dx-html-root';
    content.innerHTML = sanitized;

    // Block remote images (privacy) by removing their src until the user opts in. The original is
    // kept so a caller can surface "images blocked" affordances.
    if (!loadRemoteImages) {
      for (const img of content.querySelectorAll('img')) {
        const src = img.getAttribute('src');
        if (src && /^https?:/i.test(src)) {
          img.setAttribute('data-dx-blocked-src', src);
          img.removeAttribute('src');
        }
      }
    }

    const style = document.createElement('style');
    style.textContent = BASE_CSS + (css ?? '');
    shadow.replaceChildren(style, content);

    // Attached first: transforms may read `getComputedStyle`, which needs the subtree in the document.
    for (const transform of transforms ?? []) {
      transform(content);
    }

    if (resolveSrc) {
      resolvePendingSrc(content, resolveSrc, srcCacheRef.current);
    }
  }, [sanitized, loadRemoteImages, css, transforms, resolveSrc, themeMode]);

  return <div ref={hostRef} className={mx('w-full', classNames)} />;
};

Html.displayName = 'Html';

/** Swaps each unresolved (non-http, non-data) `src` in place once the caller's resolver returns. */
const resolvePendingSrc = (content: HTMLElement, resolveSrc: HtmlSrcResolver, cache: Map<string, string>): void => {
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

    void resolveSrc(src).then((url) => {
      if (url) {
        cache.set(src, url);
        img.setAttribute('src', url);
      }
    });
  }
};
