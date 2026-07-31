//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import React, { useMemo, useRef } from 'react';

import { Blob, Database, Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { type ThemedClassName } from '@dxos/react-ui';
import { Html, type HtmlSrcResolver, type HtmlTransform } from '@dxos/react-ui-html';
import { type Message } from '@dxos/types';

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
  /** The message's attachments — resolves `<img src="cid:...">` references against them. */
  attachments?: readonly Message.Attachment[];
  /** Database the attachments' blobs are resolved against; omit if `attachments` is empty. */
  db?: Database.Database;
}>;

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
].join('');

// Normalizes typography to the app font so themed mail reads natively. Gated on the class the theming
// transform adds rather than a prop, because the decision needs the parsed content (the table test).
const FONT_CSS =
  '.dx-email-themed *:not(code):not(pre):not(code *):not(pre *){font-family:inherit!important;line-height:1.5!important;}';

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

/**
 * Renders email HTML in the sandboxed {@link Html} host, composing the email-specific policy on top:
 * quoted-reply collapse, `cid:` attachment resolution, link handling, and theme recoloring. For simple
 * (non-table) emails the content is recolored to the app theme (see {@link processEmailColors}) so it
 * "fits" light/dark; table-heavy marketing emails are left as authored to preserve their layout.
 * Modeled on macro-inc/macro's email renderer.
 */
export const HtmlViewer = ({
  html,
  loadRemoteImages = false,
  isPersonal = false,
  attachments,
  db,
  classNames,
}: HtmlViewerProps) => {
  // Persists the quoted-reply expand state across re-renders (theme changes rebuild the shadow content).
  const quoteExpandedRef = useRef(false);

  // A stable primitive key for `attachments` — ECHO's reactive proxy can return a fresh array
  // reference on every access, so keying the resolver on `attachments` directly would rebuild the
  // content (and re-resolve cid: images) on every unrelated render.
  const attachmentsKey = useMemo(
    () => attachments?.map((attachment) => `${attachment.contentId ?? ''}:${attachment.ref.uri}`).join(',') ?? '',
    [attachments],
  );

  // Personal mail is themed regardless of layout; otherwise only simple (non-table) bodies are, so
  // marketing emails keep their brand design. The table test needs the parsed content, so the decision
  // is made inside the transform rather than from the raw string.
  const transforms = useMemo<HtmlTransform[]>(
    () => [
      markLinks,
      (content) => collapseQuotedReply(content, quoteExpandedRef),
      (content) => {
        if (!isPersonal && content.querySelector('table') !== null) {
          return;
        }
        content.classList.add('dx-email-themed');
        const params = readThemeParams(content);
        if (params) {
          processEmailColors(content, params);
        }
      },
    ],
    [isPersonal],
  );

  // `cid:` references (inline attachments, per RFC 2392) resolved against the message's attachments,
  // mirroring the `Database.load` → `Blob.url()`/`Blob.read()`+`createObjectURL()` fallback used by
  // `useImageUrl`/`plugin-file`'s image decorations.
  const resolveSrc = useMemo<HtmlSrcResolver | undefined>(() => {
    if (!db || !attachmentsKey) {
      return undefined;
    }

    const byContentId = new Map(
      (attachments ?? [])
        .filter((attachment) => attachment.contentId)
        .map((attachment) => [attachment.contentId!, attachment]),
    );
    return async (src) => {
      if (!src.startsWith('cid:')) {
        return undefined;
      }
      const attachment = byContentId.get(src.slice('cid:'.length).replace(/^<|>$/g, ''));
      if (!attachment) {
        return undefined;
      }

      return EffectEx.runPromise(
        Effect.gen(function* () {
          const blob = yield* Database.load(attachment.ref);
          if (!Obj.instanceOf(Blob.Blob, blob)) {
            return undefined;
          }
          const urlOption = yield* Blob.url(blob);
          if (Option.isSome(urlOption)) {
            return urlOption.value;
          }
          const bytes = yield* Blob.read(blob);
          // `Uint8Array` is generic over `ArrayBufferLike` (incl. `SharedArrayBuffer`) while DOM's
          // `BlobPart` only covers `ArrayBuffer`-backed views — a gap between the DOM lib types and
          // the TS standard lib, not fixable by typing `bytes` differently.
          return URL.createObjectURL(new globalThis.Blob([bytes as BlobPart], { type: blob.type }));
        }).pipe(
          Effect.provide(Database.layer(db)),
          Effect.catchAll(() => Effect.succeed(undefined)),
        ),
      );
    };
    // `attachmentsKey` stands in for `attachments` (see above).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, attachmentsKey]);

  const css = EMAIL_CSS + FONT_CSS;

  return (
    <Html
      html={html}
      loadRemoteImages={loadRemoteImages}
      css={css}
      transforms={transforms}
      resolveSrc={resolveSrc}
      classNames={classNames}
    />
  );
};

HtmlViewer.displayName = 'HtmlViewer';
