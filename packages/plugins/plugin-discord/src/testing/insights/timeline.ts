//
// Copyright 2026 DXOS.org
//

// Loads Cloudflare's announcements into an insights database as a dated product timeline, to read community sentiment
// against: the developer changelog (each entry titled "<Product> - <change>") and the blog's latest posts.
//
//   pnpm exec tsx src/testing/insights/timeline.ts --db <insights.db> [--since <iso date>]
//
// Table: announcement(link, source, product, title, published, summary), replaced per link on each run.

import { XMLParser } from 'fast-xml-parser';
import { DatabaseSync } from 'node:sqlite';
import { parseArgs } from 'node:util';

import { PRODUCTS } from './products.ts';

const FEEDS = [
  { source: 'changelog', url: 'https://developers.cloudflare.com/changelog/rss.xml' },
  { source: 'blog', url: 'https://blog.cloudflare.com/rss/' },
] as const;

type Item = {
  readonly title?: unknown;
  readonly link?: unknown;
  readonly pubDate?: unknown;
  readonly description?: unknown;
};

const text = (value: unknown): string =>
  typeof value === 'string' ? value : typeof value === 'number' ? String(value) : '';

const stripHtml = (html: string): string =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * The products an announcement names, comma-separated as `product-weeks.sql` matches them: a changelog title names them
 * before " - "; a blog title is searched for every product name, longest first, so "Workers AI" does not also count as
 * "Workers".
 */
const productsOf = (source: string, title: string): string | undefined => {
  if (source === 'changelog') {
    const head = title.split(' - ')[0]?.trim();
    return head && head !== title ? head : undefined;
  }
  let rest = title;
  const found: string[] = [];
  for (const name of [...PRODUCTS].sort((left, right) => right.length - left.length)) {
    if (rest.includes(name)) {
      found.push(name);
      rest = rest.replaceAll(name, ' ');
    }
  }
  return found.length > 0 ? found.join(', ') : undefined;
};

const { values: args } = parseArgs({ options: { db: { type: 'string' }, since: { type: 'string' } } });
if (!args.db) {
  console.error('Usage: timeline.ts --db <insights.db> [--since <iso date>]');
  process.exit(1);
}
const since = args.since ? Date.parse(args.since) : Date.now() - 90 * 86_400_000;
if (!Number.isFinite(since)) {
  console.error(`Not a date: ${args.since}`);
  process.exit(1);
}

const db = new DatabaseSync(args.db);
db.exec(`CREATE TABLE IF NOT EXISTS announcement (
  link TEXT PRIMARY KEY, source TEXT NOT NULL, product TEXT, title TEXT NOT NULL, published TEXT NOT NULL, summary TEXT
)`);
const insert = db.prepare('INSERT OR REPLACE INTO announcement VALUES (?, ?, ?, ?, ?, ?)');
const parser = new XMLParser();

for (const feed of FEEDS) {
  const response = await fetch(feed.url, { headers: { 'User-Agent': 'dxos-insights/0.1 (+https://dxos.org)' } });
  if (!response.ok) {
    console.warn(`${feed.url}: ${response.status}`);
    continue;
  }
  const document: { readonly rss?: { readonly channel?: { readonly item?: Item | Item[] } } } = parser.parse(
    await response.text(),
  );
  const raw = document.rss?.channel?.item ?? [];
  const items = Array.isArray(raw) ? raw : [raw];
  let kept = 0;
  for (const item of items) {
    const published = Date.parse(text(item.pubDate));
    const title = text(item.title);
    const link = text(item.link);
    if (!link || !title || Number.isNaN(published) || published < since) {
      continue;
    }
    insert.run(
      link,
      feed.source,
      productsOf(feed.source, title) ?? null,
      title,
      new Date(published).toISOString(),
      stripHtml(text(item.description)).slice(0, 600),
    );
    kept++;
  }
  console.log(`${feed.source}: ${kept} of ${items.length} items since ${new Date(since).toISOString().slice(0, 10)}`);
}
db.close();
