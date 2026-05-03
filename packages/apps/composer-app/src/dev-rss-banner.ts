//
// Copyright 2026 DXOS.org
//

import { log } from '@dxos/log';

/**
 * Dev-only banner that surfaces the latest entry from an Atom/RSS feed
 * underneath the boot loader's status line. Purely for entertainment during
 * the (still non-trivial) cold-boot wait — *not* something that should ever
 * ship to production. The caller is expected to gate on `import.meta.env.DEV`
 * (Vite statically replaces the constant so the bundle tree-shakes the call
 * site away in prod).
 *
 * The banner is appended as a child of `#boot-loader`, so the existing
 * `__bootLoader.dismiss()` path (which removes the whole element) tears it
 * down for free — no dismiss wiring on this side.
 *
 * Failures are intentionally silent: the dev proxy may be down, the feed may
 * be blocked, the parse may fail — none of which should disturb a developer
 * boot. We log at `info` level for visibility without polluting the console.
 */

// TODO(burdon): Configure (integrate with plugin-feed?)
// TODO(burdon): In prod point to DXOS rss feed.
const DEFAULT_FEEDS = [
  'https://www.theregister.com/software/ai_ml/headlines.atom',
  'https://news.ycombinator.com/rss',
  'https://www.latent.space/feed',
  'https://importai.substack.com/feed',
];
const DEFAULT_FEED = DEFAULT_FEEDS[Math.floor(Math.random() * DEFAULT_FEEDS.length)];

/**
 * The Vite dev server middleware proxies arbitrary feed URLs through
 * `/api/rss?url=<feed-url>` to dodge CORS. Defined in
 * `packages/apps/composer-app/vite.config.ts` (the `rss-proxy` plugin) — only
 * available in `serve` mode, which lines up with the dev-only gating here.
 */
const PROXY_PATH = '/api/rss';

export type DevRssBannerOptions = {
  /** Atom/RSS feed URL. Defaults to The Register's AI/ML headlines. */
  feedUrl?: string;
};

export const showDevRssBanner = async ({ feedUrl = DEFAULT_FEED }: DevRssBannerOptions = {}): Promise<void> => {
  try {
    const response = await fetch(`${PROXY_PATH}?url=${encodeURIComponent(feedUrl)}`);
    if (!response.ok) {
      log.info('dev-rss-banner: proxy responded non-2xx', { status: response.status, feedUrl });
      return;
    }
    const xml = await response.text();
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.querySelector('parsererror')) {
      log.info('dev-rss-banner: feed parse failed', { feedUrl });
      return;
    }

    // Atom: `<entry>`. RSS 2.0: `<item>`. Pick one at random so the banner
    // varies across reloads — small thing, but a recurring identical headline
    // every cold boot reads as broken.
    const entries = Array.from(doc.querySelectorAll('entry, item'));
    if (entries.length === 0) {
      log.info('dev-rss-banner: no entries in feed', { feedUrl });
      return;
    }

    const entry = entries[Math.floor(Math.random() * entries.length)];
    const title = entry.querySelector('title')?.textContent?.trim();
    if (!title) {
      return;
    }

    // Atom uses `<link href="…"/>`; RSS puts the URL in `<link>`'s text node.
    const linkElement = entry.querySelector('link');
    const link = linkElement?.getAttribute('href') ?? linkElement?.textContent?.trim() ?? null;

    // Atom: `<summary>`. RSS: `<description>`. Both may contain HTML — we
    // strip tags before display so the banner stays a single line of text.
    const summaryRaw =
      entry.querySelector('summary')?.textContent?.trim() ??
      entry.querySelector('description')?.textContent?.trim() ??
      null;
    const summary = summaryRaw ? stripTags(summaryRaw).slice(0, 240) : null;

    // Source domain — falls back to the feed URL's host if the entry's link
    // is missing or malformed (e.g. an `<entry>` without `<link>`).
    const source = extractHost(link) ?? extractHost(feedUrl);

    renderBanner({ title, link, summary, source });
  } catch (error) {
    log.catch(error);
  }
};

const renderBanner = ({
  title,
  link,
  summary,
  source,
}: {
  title: string;
  link: string | null;
  summary: string | null;
  source: string | null;
}) => {
  const loader = document.getElementById('boot-loader');
  if (!loader) {
    // Loader was already dismissed (fast cold boot or HMR) — nothing to
    // attach to.
    return;
  }

  const banner = document.createElement('div');
  banner.id = 'boot-loader-rss';
  Object.assign(banner.style, {
    position: 'absolute',
    left: '50%',
    bottom: '24px',
    transform: 'translateX(-50%)',
    maxWidth: 'min(640px, calc(100vw - 32px))',
    padding: '12px 16px',
    border: '1px solid #888888',
    borderRadius: '8px',
    opacity: '0.7',
    textAlign: 'center',
    pointerEvents: 'auto',
  } satisfies Partial<CSSStyleDeclaration>);

  const anchor = document.createElement(link ? 'a' : 'div');
  if (link && anchor instanceof HTMLAnchorElement) {
    anchor.href = link;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.style.color = 'inherit';
    anchor.style.textDecoration = 'none';
  }

  if (source) {
    const sourceElement = document.createElement('div');
    sourceElement.textContent = source;
    sourceElement.style.fontSize = '11px';
    sourceElement.style.textTransform = 'uppercase';
    sourceElement.style.letterSpacing = '0.08em';
    sourceElement.style.opacity = '0.6';
    sourceElement.style.marginBottom = '4px';
    anchor.appendChild(sourceElement);
  }

  const titleElement = document.createElement('div');
  titleElement.textContent = title;
  titleElement.style.fontSize = '18px';
  titleElement.style.fontWeight = '600';
  titleElement.style.marginBottom = summary ? '4px' : '0';
  anchor.appendChild(titleElement);

  if (summary) {
    const summaryElement = document.createElement('div');
    summaryElement.textContent = summary;
    summaryElement.style.fontSize = '14px';
    summaryElement.style.opacity = '0.85';
    anchor.appendChild(summaryElement);
  }

  banner.appendChild(anchor);
  loader.appendChild(banner);
};

const stripTags = (str: string) =>
  str
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Extract the host (e.g. "theregister.com") from a URL string. Returns
 * `null` for missing / malformed input. Strips a leading `www.` so the
 * label reads cleanly.
 */
const extractHost = (url: string | null): string | null => {
  if (!url) {
    return null;
  }
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
};
