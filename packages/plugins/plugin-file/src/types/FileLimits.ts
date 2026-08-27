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

export const isAcceptedMimeType = (type: string): boolean => {
  if (type === 'application/pdf') {
    return true;
  }
  if (type.startsWith('image/') || type.startsWith('video/')) {
    return true;
  }
  return ACCEPTED_TEXT_TYPES.has(type);
};
