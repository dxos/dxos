//
// Copyright 2026 DXOS.org
//

/** Stored in place of a type that is absent or would execute; the bytes are kept, only the label changes. */
export const FALLBACK_MIME_TYPE = 'application/octet-stream';

/**
 * Media types a browser executes when it renders them.
 *
 * A stored file is handed back through a presigned, public or `blob:` URL on the app's origin, and
 * HTML served from there runs with that origin — making an upload a stored-XSS primitive. Such
 * files are still accepted, but labelled {@link FALLBACK_MIME_TYPE} so they download rather than
 * render. Matches the blob service's own `ACTIVE_CONTENT_TYPES`, minus SVG, which image previews
 * rely on.
 */
const ACTIVE_CONTENT_TYPES = new Set(['text/html', 'application/xhtml+xml', 'text/xml', 'application/xml']);

/**
 * The media type to store for an upload. Every type is accepted — the file plugin keeps bytes it
 * cannot preview — so this never rejects; it only neutralizes types that are missing or executable.
 * Compared case-insensitively and without parameters: RFC 2045 defines type and subtype as
 * case-insensitive, and `text/html; charset=utf-8` is still HTML.
 */
export const toStoredMimeType = (type: string | undefined): string => {
  const declared = type?.trim() ?? '';
  const base = declared.split(';')[0].trim().toLowerCase();
  return base.length === 0 || ACTIVE_CONTENT_TYPES.has(base) ? FALLBACK_MIME_TYPE : declared;
};
