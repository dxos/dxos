//
// Copyright 2026 DXOS.org
//

// Deliberately outside the `util` barrel, like `./cors`: the Worker imports this leaf directly, and
// the barrel re-exports modules that pull Automerge's wasm into the Worker bundle.

/**
 * Content-hashed build output, which vite emits flat in `/assets/`. Subdirectories there are copied
 * static trees (`/assets/plugin-tldraw/**`) whose filenames are stable across builds, so the
 * immutable header must not reach them — a year-long `max-age` on those would strand every existing
 * client on the icons and fonts it already has.
 */
const HASHED_ASSET_PATH = /^\/assets\/[^/]+$/;

/** A path naming a file rather than a client-side route, i.e. one carrying an extension. */
const FILE_PATH = /\.[a-zA-Z0-9]+$/;

/**
 * For archive hits, which the Worker builds itself. Live assets get the same value from
 * `public/_headers`, since the Worker never sees them; keep the two in step.
 */
export const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

/** Whether a path names build output that can never change under a client. */
export const isHashedAssetPath = (pathname: string): boolean => HASHED_ASSET_PATH.test(pathname);

/**
 * Whether an asset response is really the SPA fallback standing in for a file that is gone.
 *
 * `not_found_handling: "single-page-application"` answers EVERY unmatched path with `index.html` and
 * a 200, asset paths included. A chunk dropped by a later deploy therefore resolves to an HTML
 * document with a success status, and the browser reports a module parse or MIME failure rather than
 * a missing file — which is why a stale tab's lazy import reads as an unrelated crash.
 *
 * Gated on `Sec-Fetch-Mode` rather than on the path alone, so a navigation keeps the SPA fallback
 * whatever its URL looks like and a client-side route containing a dot is never mistaken for a
 * missing file. A request with no `Sec-Fetch-Mode` at all (curl, a non-browser client) is treated as
 * a subresource: that is what makes the failure visible to a probe.
 */
export const isMissingAsset = ({
  status,
  pathname,
  secFetchMode,
  contentType,
}: {
  status: number;
  pathname: string;
  secFetchMode: string | null;
  contentType: string | null;
}): boolean =>
  status === 200 &&
  secFetchMode !== 'navigate' &&
  FILE_PATH.test(pathname) &&
  !pathname.endsWith('.html') &&
  (contentType ?? '').startsWith('text/html');
