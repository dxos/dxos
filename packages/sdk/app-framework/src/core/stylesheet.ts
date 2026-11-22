//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { BaseError } from '@dxos/errors';

/** Tagged error for a stylesheet the document could not load; `context.href` is its URL. */
export class StylesheetLoadError extends BaseError.extend('StylesheetLoadError', 'Failed to load stylesheet') {}

/**
 * Links the stylesheet at `href` into the document and waits for it to load. A bundler attaches a
 * chunk's CSS in the helper it wraps `import()` with; a module imported from a manifest URL bypasses
 * that helper, so its stylesheets are linked here. Does nothing where there is no document, or when
 * the document already links the stylesheet.
 * @param href URL of the stylesheet, resolved against `from`.
 * @param from URL of the module that needs the stylesheet; the document's base when omitted.
 */
export const load = (href: string, from?: string): Effect.Effect<void, StylesheetLoadError> =>
  Effect.callback<void, StylesheetLoadError>((resume) => {
    if (typeof document === 'undefined') {
      resume(Effect.void);
      return;
    }
    // Absolute, which is how the bundler's helper compares the links it finds against those it is about to add.
    const target = new URL(href, from ? new URL(from, document.baseURI) : document.baseURI).href;
    const links = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'));
    if (links.some((link) => link.href === target)) {
      resume(Effect.void);
      return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = target;
    link.addEventListener('load', () => resume(Effect.void), { once: true });
    link.addEventListener('error', () => resume(Effect.fail(new StylesheetLoadError({ context: { href: target } }))), {
      once: true,
    });
    document.head.appendChild(link);
  });
