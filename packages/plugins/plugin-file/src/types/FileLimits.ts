//
// Copyright 2026 DXOS.org
//

export const ACCEPTED_MIME: Record<string, string[]> = {
  'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
  'video/*': ['.mp4', '.webm', '.mov'],
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],
  'text/markdown': ['.md'],
  'application/json': ['.json'],
};

/**
 * Text types an assistant may legitimately produce. Deliberately an allowlist rather than a
 * `text/*` prefix test:
 *
 * `text/html` must NOT be accepted. A stored file is handed back through a presigned or public URL,
 * and HTML served from that origin executes — making an upload a stored-XSS primitive. The same
 * reasoning already excludes SVG from `plugin-crm`'s image allowlist.
 */
const ACCEPTED_TEXT_TYPES = new Set(['text/plain', 'text/csv', 'text/markdown', 'application/json']);

/**
 * Whether a media type may be stored. Case-insensitive: RFC 2045 defines the type and subtype as
 * case-insensitive, and a server that answers `Text/Plain` is within its rights.
 */
export const isAcceptedMimeType = (type: string): boolean => {
  const normalized = type.trim().toLowerCase();
  if (normalized === 'application/pdf') {
    return true;
  }
  if (normalized.startsWith('image/') || normalized.startsWith('video/')) {
    return true;
  }
  return ACCEPTED_TEXT_TYPES.has(normalized);
};
