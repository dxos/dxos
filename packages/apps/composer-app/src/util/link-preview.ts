//
// Copyright 2026 DXOS.org
//

// Deliberately outside the `util` barrel, like `./cors`: the Worker imports this leaf directly, and
// the barrel re-exports modules that pull Automerge's wasm into the Worker bundle.

/** Mirrors `UrlPath.TITLE_PARAM`, which the Worker cannot import without pulling ECHO into its bundle. */
export const TITLE_PARAM = 'title';

/** Mirrors `UrlPath.MAX_TITLE_LENGTH`; re-applied here because the parameter arrives from anyone. */
const MAX_TITLE_LENGTH = 60;

const SITE_NAME = 'Composer';

const IMAGE_WIDTH = 1200;
const IMAGE_HEIGHT = 630;

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

const escapeHtml = (text: string): string => text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);

/** The preview title a URL carries, collapsed and truncated, or `undefined` when it carries none. */
export const readLinkTitle = (url: URL): string | undefined => {
  const collapsed = url.searchParams.get(TITLE_PARAM)?.replace(/\s+/g, ' ').trim();
  if (!collapsed) {
    return undefined;
  }
  const chars = [...collapsed];
  return chars.length > MAX_TITLE_LENGTH
    ? `${chars
        .slice(0, MAX_TITLE_LENGTH - 1)
        .join('')
        .trimEnd()}…`
    : collapsed;
};

export type LinkPreviewDetails = {
  description?: string;
  /** Absolute URL of a 1200×630 image, which makes the preview a large card. */
  image?: string;
};

/**
 * Name the page in `html` after `title`, for crawlers (Discord, Slack, iMessage) that read the served
 * markup and never run the app: rewrites `<title>` and adds Open Graph and Twitter tags.
 */
export const injectLinkPreview = (
  html: string,
  title: string,
  { description, image }: LinkPreviewDetails = {},
): string => {
  const escaped = escapeHtml(title);
  const summary = description && escapeHtml(description);
  const picture = image && escapeHtml(image);
  const tags = [
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${escaped}" />`,
    ...(summary ? [`<meta property="og:description" content="${summary}" />`] : []),
    ...(picture
      ? [
          `<meta property="og:image" content="${picture}" />`,
          `<meta property="og:image:width" content="${IMAGE_WIDTH}" />`,
          `<meta property="og:image:height" content="${IMAGE_HEIGHT}" />`,
        ]
      : []),
    `<meta name="twitter:card" content="${picture ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${escaped}" />`,
    ...(summary ? [`<meta name="twitter:description" content="${summary}" />`] : []),
    ...(picture ? [`<meta name="twitter:image" content="${picture}" />`] : []),
  ].join('\n    ');
  // Replacer functions, since a `$` in the title would otherwise read as a replacement pattern.
  const named = html
    .replace(/<title>[^<]*<\/title>/, () => `<title>${escaped} | ${SITE_NAME}</title>`)
    .replace('</head>', () => `    ${tags}\n  </head>`);
  return summary
    ? named.replace(
        /<meta name="description" content="[^"]*" \/>/,
        () => `<meta name="description" content="${summary}" />`,
      )
    : named;
};
