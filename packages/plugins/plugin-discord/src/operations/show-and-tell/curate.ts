//
// Copyright 2026 DXOS.org
//

import { type ShowAndTell } from '#types';

//
// The deterministic half of curation: which links a message shares, what each one is by default, and the digest the
// curator summarizes a period from. The model only enriches these (title, category, summary).
//

/** A link to file, with whatever the model added. */
export type Shared = { url: string; title?: string; category?: ShowAndTell.Category; summary?: string };

/** A filed row, as the digest reads it. */
export type Row = {
  date: string;
  author: string;
  link: string;
  title: string;
  category: ShowAndTell.Category;
  summary: string;
};

/** Stops at whitespace and at the delimiters Discord markdown wraps a link in (`<…>`, `[…](…)`). */
const URL_PATTERN = /https?:\/\/[^\s<>()[\]{}"'`|]+/gi;

/** Sentence punctuation that ends a link written at the end of a clause. */
const TRAILING_PUNCTUATION = /[.,;:!?*_~]+$/;

/** Tracking parameters that make one page look like two links. */
const TRACKING_PARAMS = /^(utm_[a-z]+|fbclid|gclid|si)$/i;

/** Discord CDN attachment URLs are signed and expire within a day, so a table must not keep them. */
const EXPIRING_HOSTS = new Set(['cdn.discordapp.com', 'media.discordapp.net']);

/** The link written canonically: tracking parameters dropped, so the same page shared twice is filed once. */
export const normalizeLink = (link: string): string => {
  const trimmed = link.trim().replace(TRAILING_PUNCTUATION, '');
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return trimmed;
  }
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMS.test(key)) {
      url.searchParams.delete(key);
    }
  }
  return url.toString();
};

/** The http(s) links in a message, in order, each once. */
export const extractLinks = (text: string): string[] => {
  const links = (text.match(URL_PATTERN) ?? []).map(normalizeLink).filter((link) => link.length > 0);
  return [...new Set(links)];
};

const hostOf = (link: string): string | undefined => {
  try {
    return new URL(link).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return undefined;
  }
};

const pathOf = (link: string): string => {
  try {
    return new URL(link).pathname.toLowerCase();
  } catch {
    return '';
  }
};

/** Whether the link stops working within a day (a Discord attachment's CDN URL). */
export const isExpiringLink = (link: string): boolean => {
  const host = hostOf(link);
  return host !== undefined && EXPIRING_HOSTS.has(host);
};

const matchesHost = (host: string, domains: readonly string[]) =>
  domains.some((domain) => host === domain || host.endsWith(`.${domain}`));

const VIDEO_HOSTS = ['youtube.com', 'youtu.be', 'loom.com', 'vimeo.com', 'wistia.com', 'descript.com'];
const VIDEO_EXTENSIONS = /\.(mp4|mov|webm|mkv|m4v)$/;
const DESIGN_HOSTS = ['figma.com', 'excalidraw.com', 'tldraw.com', 'miro.com', 'dribbble.com'];
const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|svg)$/;
const CODE_HOSTS = ['github.com', 'gitlab.com', 'codesandbox.io', 'stackblitz.com', 'npmjs.com', 'pkg.pr.new'];
const DOC_HOSTS = ['docs.google.com', 'notion.so', 'notion.site', 'hackmd.io', 'linear.app', 'docs.dxos.org'];
const DOC_EXTENSIONS = /\.(pdf|md|docx?|pptx?|key)$/;
const DEMO_HOSTS = [
  'composer.space',
  'dxos.network',
  'claude.ai',
  'vercel.app',
  'netlify.app',
  'pages.dev',
  'workers.dev',
  'replit.app',
];
const LOCAL_HOSTS = ['localhost', '127.0.0.1'];
const ARTICLE_HOSTS = ['medium.com', 'substack.com', 'news.ycombinator.com', 'x.com', 'twitter.com', 'arxiv.org'];

/**
 * The category a link gets when the model gives none, by its host and file extension. Order matters: a GitHub
 * attachment that is a video is a video, and a Google Doc is a doc before it is anything else.
 */
export const categorize = (link: string): ShowAndTell.Category => {
  const host = hostOf(link);
  if (!host) {
    return 'other';
  }
  const path = pathOf(link);
  if (matchesHost(host, VIDEO_HOSTS) || VIDEO_EXTENSIONS.test(path)) {
    return 'video';
  }
  if (matchesHost(host, DESIGN_HOSTS)) {
    return 'design';
  }
  if (matchesHost(host, DOC_HOSTS) || DOC_EXTENSIONS.test(path)) {
    return 'doc';
  }
  if (matchesHost(host, CODE_HOSTS)) {
    return 'code';
  }
  // A screenshot or a hosted app shows something working.
  if (matchesHost(host, DEMO_HOSTS) || LOCAL_HOSTS.includes(host) || IMAGE_EXTENSIONS.test(path)) {
    return 'demo';
  }
  if (matchesHost(host, ARTICLE_HOSTS) || host.startsWith('blog.') || path.includes('/blog/')) {
    return 'article';
  }
  return 'other';
};

/** A title is a table cell, so a long path is cut. */
const TITLE_LIMIT = 80;

/** A readable title for a link the model gave none for: its host and path, e.g. `github.com/dxos/dxos/pull/1`. */
export const titleFromLink = (link: string): string => {
  let title = link;
  try {
    const url = new URL(link);
    const path = decodeURIComponent(url.pathname).replace(/\/+$/, '');
    title = `${url.hostname.replace(/^www\./, '')}${path}`;
  } catch {
    // Not a URL: the text itself is the best title there is.
  }
  return title.length > TITLE_LIMIT ? `${title.slice(0, TITLE_LIMIT - 1)}…` : title;
};

/**
 * The links one message shares: every link in its text, in order, then any the model listed that the text does not
 * hold (attachments). The model's title, category and summary are kept on the link they name. Expiring attachment
 * URLs are dropped; their message's own link stands in for them, once.
 */
export const mergeShared = (
  text: string,
  provided: readonly Shared[] = [],
  { messageLink }: { messageLink?: string } = {},
): Shared[] => {
  const byLink = new Map<string, Shared>();
  const add = (shared: Shared) => {
    const url = normalizeLink(shared.url);
    if (url.length === 0) {
      return;
    }
    const existing = byLink.get(url);
    byLink.set(url, { ...existing, ...definedFields(shared), url });
  };

  for (const link of extractLinks(text)) {
    add({ url: link });
  }
  for (const shared of provided) {
    add(shared);
  }

  const expiring = [...byLink.values()].filter(({ url }) => isExpiringLink(url));
  for (const { url } of expiring) {
    byLink.delete(url);
  }
  if (expiring.length > 0 && messageLink) {
    const [first] = expiring;
    const names = expiring.map(({ url, title }) => title ?? fileName(url));
    add({
      url: messageLink,
      title: first.title ?? names.join(', '),
      ...(first.category ? { category: first.category } : { category: categorize(first.url) }),
      ...(first.summary ? { summary: first.summary } : {}),
    });
  }
  return [...byLink.values()];
};

const definedFields = (shared: Shared): Partial<Shared> =>
  Object.fromEntries(Object.entries(shared).filter(([, value]) => value !== undefined && value !== ''));

const fileName = (link: string): string => {
  try {
    return decodeURIComponent(new URL(link).pathname.split('/').pop() ?? '') || link;
  } catch {
    return link;
  }
};

/** A half-open `[from, to)` range of ISO timestamps; both absent means all time. */
export type Range = { from?: string; to?: string };

const DAY_MS = 24 * 60 * 60 * 1000;

/** Midnight UTC of the Monday on or before `date`. */
export const startOfWeek = (date: Date): Date => {
  const midnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  // `getUTCDay` counts from Sunday; weeks here start on Monday.
  const sinceMonday = (new Date(midnight).getUTCDay() + 6) % 7;
  return new Date(midnight - sinceMonday * DAY_MS);
};

/** The range a period names, relative to `now`. */
export const periodRange = (period: 'this-week' | 'last-week' | 'this-month' | 'all', now: Date): Range => {
  switch (period) {
    case 'this-week': {
      const from = startOfWeek(now);
      return { from: from.toISOString(), to: new Date(from.getTime() + 7 * DAY_MS).toISOString() };
    }
    case 'last-week': {
      const to = startOfWeek(now);
      return { from: new Date(to.getTime() - 7 * DAY_MS).toISOString(), to: to.toISOString() };
    }
    case 'this-month': {
      const from = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
      const to = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
      return { from: new Date(from).toISOString(), to: new Date(to).toISOString() };
    }
    case 'all':
      return {};
  }
};

/** Whether an ISO timestamp falls in the range; compared as instants, so offsets other than `Z` work. */
export const inRange = (date: string, { from, to }: Range): boolean => {
  const at = Date.parse(date);
  if (Number.isNaN(at)) {
    return false;
  }
  return (from === undefined || at >= Date.parse(from)) && (to === undefined || at < Date.parse(to));
};

/** Markdown the curator summarizes from: one section per author (most rows first), one line per row, oldest first. */
export const digest = (rows: readonly Row[]): string => {
  if (rows.length === 0) {
    return 'Nothing was shared in this period.';
  }
  const byAuthor = new Map<string, Row[]>();
  for (const row of [...rows].sort((left, right) => Date.parse(left.date) - Date.parse(right.date))) {
    byAuthor.set(row.author, [...(byAuthor.get(row.author) ?? []), row]);
  }
  return [...byAuthor.entries()]
    .sort(
      ([leftAuthor, left], [rightAuthor, right]) => right.length - left.length || leftAuthor.localeCompare(rightAuthor),
    )
    .map(([author, authored]) =>
      [
        `**${author}** (${authored.length})`,
        ...authored.map(
          ({ date, title, link, category, summary }) =>
            `- ${date.slice(0, 10)} [${title}](${link}) · ${category}${summary ? ` — ${summary}` : ''}`,
        ),
      ].join('\n'),
    )
    .join('\n\n');
};
