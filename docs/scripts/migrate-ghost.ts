#!/usr/bin/env npx tsx
//
// Copyright 2026 DXOS.org
//
// One-time migration script: converts a Ghost JSON export into Astro content collection markdown files
// and downloads images locally.
//
// Usage: npx tsx docs/scripts/migrate-ghost.ts <path-to-ghost-export.json>
//

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as https from 'node:https';
import * as http from 'node:http';

import TurndownService from 'turndown';

const GHOST_BASE_URL = 'https://blog.dxos.org';
const OUTPUT_CONTENT_DIR = path.resolve(import.meta.dirname, '../src/content/blog');
const OUTPUT_IMAGES_DIR = path.resolve(import.meta.dirname, '../public/blog/images');

interface GhostPost {
  id: string;
  title: string;
  slug: string;
  html: string;
  status: string;
  published_at: string;
  custom_excerpt: string | null;
  feature_image: string | null;
  plaintext: string | null;
}

interface GhostUser {
  id: string;
  name: string;
}

interface GhostTag {
  id: string;
  name: string;
}

interface GhostPostAuthor {
  post_id: string;
  author_id: string;
  sort_order: number;
}

interface GhostPostTag {
  post_id: string;
  tag_id: string;
  sort_order: number;
}

const downloadFile = (url: string, dest: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) {
      resolve();
      return;
    }

    const dir = path.dirname(dest);
    fs.mkdirSync(dir, { recursive: true });

    const transport = url.startsWith('https') ? https : http;
    transport.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadFile(redirectUrl, dest).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: HTTP ${response.statusCode}`));
        return;
      }

      const file = fs.createWriteStream(dest);
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
      file.on('error', (err) => {
        fs.unlinkSync(dest);
        reject(err);
      });
    }).on('error', reject);
  });
};

/**
 * Resolve a Ghost image URL to a downloadable URL and a local path.
 * Strips `/size/wNNN/` variants to use the original.
 */
const resolveImageUrl = (rawUrl: string): { downloadUrl: string; localPath: string } | null => {
  if (rawUrl.includes('spacergif.org')) {
    return null;
  }

  let normalized = rawUrl.replace('__GHOST_URL__', GHOST_BASE_URL);

  // Strip Ghost sized image variants — use the original.
  normalized = normalized.replace(/\/size\/w\d+\//, '/');

  const filename = path.basename(new URL(normalized).pathname);
  return {
    downloadUrl: normalized,
    localPath: `/blog/images/${filename}`,
  };
};

const formatDate = (isoDate: string): string => {
  return isoDate.slice(0, 10);
};

const escapeYaml = (value: string): string => {
  if (value.includes(':') || value.includes('#') || value.includes('"') || value.includes("'") || value.startsWith(' ')) {
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  return value;
};

const buildFrontmatter = (fields: Record<string, string | string[] | undefined>): string => {
  const lines = ['---'];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) {
      continue;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`);
      } else {
        lines.push(`${key}:`);
        for (const item of value) {
          lines.push(`  - ${escapeYaml(item)}`);
        }
      }
    } else {
      lines.push(`${key}: ${escapeYaml(value)}`);
    }
  }
  lines.push('---');
  return lines.join('\n');
};

const main = async () => {
  const exportPath = process.argv[2];
  if (!exportPath) {
    console.error('Usage: npx tsx docs/scripts/migrate-ghost.ts <path-to-ghost-export.json>');
    process.exit(1);
  }

  const raw = fs.readFileSync(exportPath, 'utf-8');
  const data = JSON.parse(raw);
  const db = data.db[0].data;

  const users: Record<string, string> = {};
  for (const user of db.users as GhostUser[]) {
    users[user.id] = user.name;
  }

  const tags: Record<string, string> = {};
  for (const tag of db.tags as GhostTag[]) {
    // Skip internal Ghost tags (prefixed with #).
    if (!tag.name.startsWith('#')) {
      tags[tag.id] = tag.name;
    }
  }

  const postAuthors: Record<string, string[]> = {};
  for (const pa of db.posts_authors as GhostPostAuthor[]) {
    if (!postAuthors[pa.post_id]) {
      postAuthors[pa.post_id] = [];
    }
    const authorName = users[pa.author_id];
    if (authorName) {
      postAuthors[pa.post_id].push(authorName);
    }
  }

  const postTags: Record<string, string[]> = {};
  for (const pt of db.posts_tags as GhostPostTag[]) {
    if (!postTags[pt.post_id]) {
      postTags[pt.post_id] = [];
    }
    const tagName = tags[pt.tag_id];
    if (tagName) {
      postTags[pt.post_id].push(tagName);
    }
  }

  const posts = (db.posts as GhostPost[]).filter((p) => p.status === 'published');
  console.log(`Found ${posts.length} published posts`);

  fs.mkdirSync(OUTPUT_CONTENT_DIR, { recursive: true });
  fs.mkdirSync(OUTPUT_IMAGES_DIR, { recursive: true });

  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
  });

  // Track images to download.
  const imagesToDownload: Map<string, string> = new Map();

  for (const post of posts) {
    const datePrefix = formatDate(post.published_at);
    const filename = `${datePrefix}-${post.slug}.md`;

    const author = postAuthors[post.id]?.[0] ?? 'DXOS';
    const postTagList = postTags[post.id] ?? [];

    // Convert HTML to markdown.
    let html = post.html;

    // Rewrite Ghost image URLs in HTML before conversion.
    html = html.replace(
      /(src|href)="(__GHOST_URL__\/content\/[^"]+|https:\/\/blog\.dxos\.org\/content\/[^"]+)"/g,
      (_match, attr, url) => {
        const resolved = resolveImageUrl(url);
        if (resolved) {
          imagesToDownload.set(resolved.downloadUrl, path.join(OUTPUT_IMAGES_DIR, path.basename(resolved.localPath)));
          return `${attr}="${resolved.localPath}"`;
        }
        return `${attr}=""`;
      },
    );

    // Remove spacergif placeholders.
    html = html.replace(/<img[^>]*spacergif\.org[^>]*>/g, '');

    let markdown = turndown.turndown(html);

    // Clean up excessive blank lines.
    markdown = markdown.replace(/\n{3,}/g, '\n\n');

    // Resolve feature image.
    let featureImage: string | undefined;
    if (post.feature_image) {
      const resolved = resolveImageUrl(post.feature_image);
      if (resolved) {
        featureImage = resolved.localPath;
        imagesToDownload.set(resolved.downloadUrl, path.join(OUTPUT_IMAGES_DIR, path.basename(resolved.localPath)));
      }
    }

    // Extract description from custom_excerpt or first paragraph of plaintext.
    let description: string | undefined = post.custom_excerpt ?? undefined;
    if (!description && post.plaintext) {
      const firstParagraph = post.plaintext.split('\n\n')[0]?.trim();
      if (firstParagraph && firstParagraph.length > 20) {
        description = firstParagraph.length > 280 ? firstParagraph.slice(0, 277) + '...' : firstParagraph;
      }
    }

    const frontmatter = buildFrontmatter({
      title: post.title,
      slug: post.slug,
      date: datePrefix,
      description,
      author,
      tags: postTagList,
      featureImage,
    });

    const content = `${frontmatter}\n\n${markdown}\n`;
    const outputPath = path.join(OUTPUT_CONTENT_DIR, filename);
    fs.writeFileSync(outputPath, content, 'utf-8');
    console.log(`  Wrote: ${filename}`);
  }

  // Download images.
  console.log(`\nDownloading ${imagesToDownload.size} images...`);
  for (const [url, dest] of imagesToDownload) {
    try {
      await downloadFile(url, dest);
      console.log(`  Downloaded: ${path.basename(dest)}`);
    } catch (err) {
      console.error(`  Failed: ${url} — ${(err as Error).message}`);
    }
  }

  console.log('\nMigration complete.');
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
