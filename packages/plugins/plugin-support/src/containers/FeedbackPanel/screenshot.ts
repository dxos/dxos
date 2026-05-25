//
// Copyright 2026 DXOS.org
//

// Screenshot capture + upload used by FeedbackPanel's "Create GitHub Issue" path.
//
// Two side-effects in one module on purpose:
//   1. `captureScreenshot(target)` — DOM → PNG `Blob` via `html-to-image`.
//      Walks the tree first and obscures sensitive content (inputs, textareas,
//      contenteditable) so we never upload secrets, passwords, or PII to the
//      public image-service CDN.
//   2. `uploadScreenshot(blob, serviceUrl)` — multipart POST to Composer's
//      shared image service (same protocol used by `plugin-crm` and
//      `composer-crx`). Returns a permanent public URL we can drop into the
//      GitHub issue body as `![](url)`.
//
// The `html-to-image` import is dynamic on purpose — pays the ~30 KB only when
// the user actually clicks "Create GitHub Issue", not on every panel mount.

import { log } from '@dxos/log';

/**
 * Default Composer image-service base URL — the Cloudflare Worker that `composer-crx`
 * uses in production (see `packages/apps/composer-crx/src/config.ts`). The `images.dxos.org`
 * alias that `@dxos/plugin-crm` defaults to is not yet DNS-mapped, so we point at the
 * worker URL directly. Override per-environment via `DX_IMAGE_SERVICE_URL`.
 */
export const DEFAULT_IMAGE_SERVICE_URL = 'https://image-service-main.dxos.workers.dev';

/** Hard ceiling on the captured PNG — matches the CRM caller's cap. */
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/**
 * Replace each input/textarea/contenteditable element under `root` with a span
 * containing dots, returning a cleanup function that restores the originals.
 *
 * We can't simply overwrite the `value` because that mutates the user's draft.
 * Instead we swap each node for a placeholder span, snapshot the original, and
 * re-insert it on cleanup. The capture happens between obscure() and restore(),
 * so the user only ever sees the form re-appear after html-to-image is done.
 */
const obscureInputs = (root: HTMLElement): (() => void) => {
  const swaps: Array<{ original: Element; placeholder: HTMLElement }> = [];

  const placeholderFor = (text: string): HTMLElement => {
    const span = document.createElement('span');
    // `••••` of approximately the same length as the original, capped so we
    // don't blow up the layout when a user has a long body field.
    const dots = '•'.repeat(Math.min(Math.max(text.length, 4), 32));
    span.textContent = dots;
    span.style.color = 'var(--dx-base-foreground, currentColor)';
    span.style.fontFamily = 'inherit';
    return span;
  };

  // `[contenteditable]` catches the empty-attribute form (`<div contenteditable>`)
  // and `plaintext-only` in addition to `"true"`; the `:not([contenteditable="false"])`
  // exclusion mirrors the spec's "false explicitly disables" semantics.
  for (const node of root.querySelectorAll('input, textarea, [contenteditable]:not([contenteditable="false"])')) {
    const text =
      node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement
        ? (node.value ?? '')
        : (node.textContent ?? '');
    if (text.length === 0) {
      continue;
    }
    const placeholder = placeholderFor(text);
    node.parentNode?.replaceChild(placeholder, node);
    swaps.push({ original: node, placeholder });
  }

  return () => {
    for (const { original, placeholder } of swaps) {
      placeholder.parentNode?.replaceChild(original, placeholder);
    }
  };
};

/** JPEG quality for the captured screenshot (0-1). 0.8 is a sweet spot between size and legibility. */
const JPEG_QUALITY = 0.8;

/** Decode a JPEG data URL produced by `html-to-image#toJpeg` into a Blob. */
const dataUrlToBlob = (dataUrl: string): Blob => {
  const commaIndex = dataUrl.indexOf(',');
  const meta = dataUrl.slice(5, commaIndex); // `image/jpeg;base64`
  const payload = dataUrl.slice(commaIndex + 1);
  const mimeType = meta.split(';')[0];
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
};

/**
 * Capture the given DOM subtree as a JPEG `Blob`, with input/textarea contents
 * obscured. JPEG (over PNG) keeps the upload payload small enough not to OOM
 * the image-service Worker (128 MB budget). Returns `undefined` (and logs) if
 * the underlying library fails — the caller should treat capture as
 * best-effort and still file the issue.
 */
export const captureScreenshot = async (target: HTMLElement = document.body): Promise<Blob | undefined> => {
  // The dynamic import + obscure step both happen inside the try block so a
  // module-load failure (rare but possible) doesn't escape — callers treat
  // capture as best-effort and we'd rather drop the screenshot than throw.
  let restore: (() => void) | undefined;
  try {
    const { toJpeg } = await import('html-to-image');
    restore = obscureInputs(target);
    const dataUrl = await toJpeg(target, {
      // `pixelRatio: 1` avoids generating a Retina-density image whose payload
      // can exceed the worker's memory budget when it decodes + resizes.
      // Triage screenshots don't need 2× density.
      pixelRatio: 1,
      quality: JPEG_QUALITY,
      cacheBust: true,
      backgroundColor: getComputedStyle(target).backgroundColor || '#ffffff',
      // The library defaults to drawing every CSS background image; some apps
      // pull from cross-origin CDNs which taints the canvas. `skipFonts` keeps
      // bundle size down by not inlining custom fonts (we accept the platform
      // font fallback in the screenshot).
      skipFonts: true,
    });
    if (!dataUrl || dataUrl === 'data:,') {
      log.warn('html-to-image returned empty data url');
      return undefined;
    }
    const blob = dataUrlToBlob(dataUrl);
    log.info('screenshot blob', { bytes: blob.size, mime: blob.type });
    if (blob.size > MAX_IMAGE_BYTES) {
      log.warn('screenshot exceeds size cap; skipping', { size: blob.size, cap: MAX_IMAGE_BYTES });
      return undefined;
    }
    return blob;
  } catch (err) {
    log.warn('screenshot capture failed', { err });
    return undefined;
  } finally {
    // restore() may be undefined if we threw before obscureInputs ran.
    restore?.();
  }
};

/**
 * Upload an image blob (PNG or JPEG) to the Composer image service. Returns the resulting public
 * URL on success, or `undefined` on transport / service error so the caller can
 * proceed without an image rather than block the report.
 *
 * Service contract: POST multipart/form-data `file=<blob>` → `{ url }`
 */
export const uploadScreenshot = async (
  blob: Blob,
  serviceUrl: string = DEFAULT_IMAGE_SERVICE_URL,
): Promise<string | undefined> => {
  const form = new FormData();
  // Filename extension matches the blob mime so the worker can pick the right
  // codec; falls back to `.png` for any non-jpeg blob (e.g. legacy callers).
  const ext = blob.type === 'image/jpeg' ? 'jpg' : 'png';
  form.append('file', blob, `composer-${Date.now()}.${ext}`);

  try {
    const res = await fetch(new URL('/upload', serviceUrl).toString(), {
      method: 'POST',
      body: form,
      // 15s aligns with plugin-crm's external-fetch timeout.
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      log.warn('image-service rejected upload', { status: res.status });
      return undefined;
    }
    const json = (await res.json()) as { url?: string };
    if (!json.url) {
      log.warn('image-service returned no url', { json });
      return undefined;
    }
    return json.url;
  } catch (err) {
    log.warn('screenshot upload failed', { err });
    return undefined;
  }
};
