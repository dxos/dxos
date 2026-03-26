#!/usr/bin/env npx tsx
//
// Copyright 2026 DXOS.org
//
// Syncs blog posts to AT Protocol as site.standard.document records.
// Optionally creates Bluesky announcement posts and writes the bskyPostUri
// and documentAtUri back to the markdown frontmatter.
//
// Required env vars:
//   ATPROTO_HANDLE       - Your Bluesky handle (e.g., dxos.org)
//   ATPROTO_APP_PASSWORD - An app password
//
// Optional env vars:
//   SITE_URL             - Base URL of the site (default: https://dxos.org)
//   ANNOUNCE             - Set to "true" to also create Bluesky announcement posts
//   DRY_RUN              - Set to "true" to preview without publishing
//
// Usage:
//   npx tsx docs/scripts/sync-to-atproto.ts
//   ANNOUNCE=true npx tsx docs/scripts/sync-to-atproto.ts
//

import * as fs from 'node:fs';
import * as path from 'node:path';

import { AtpAgent, RichText } from '@atproto/api';
import { StandardSitePublisher, transformContent } from '@bryanguffey/astro-standard-site';

const handle = process.env.ATPROTO_HANDLE;
const appPassword = process.env.ATPROTO_APP_PASSWORD;
const siteUrl = process.env.SITE_URL ?? 'https://dxos.org';
const shouldAnnounce = process.env.ANNOUNCE === 'true';
const dryRun = process.env.DRY_RUN === 'true';

if (!handle || !appPassword) {
  console.error('Required env vars: ATPROTO_HANDLE, ATPROTO_APP_PASSWORD');
  process.exit(1);
}

interface BlogFrontmatter {
  title: string;
  slug: string;
  date: string;
  description?: string;
  author: string;
  tags: string[];
  featureImage?: string;
  bskyPostUri?: string;
  documentAtUri?: string;
}

const parseFrontmatter = (content: string): { frontmatter: BlogFrontmatter; body: string } => {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    throw new Error('Could not parse frontmatter');
  }

  const [, rawFrontmatter, body] = match;
  const frontmatter: Record<string, unknown> = {};

  let currentKey = '';
  let inArray = false;
  const arrayItems: string[] = [];

  for (const line of rawFrontmatter.split('\n')) {
    if (line.startsWith('  - ') && inArray) {
      arrayItems.push(line.replace('  - ', '').replace(/^"(.*)"$/, '$1'));
    } else {
      if (inArray) {
        frontmatter[currentKey] = [...arrayItems];
        arrayItems.length = 0;
        inArray = false;
      }

      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        const key = line.slice(0, colonIdx).trim();
        let value = line.slice(colonIdx + 1).trim();
        currentKey = key;

        if (value === '' || value === '[]') {
          if (value === '[]') {
            frontmatter[key] = [];
          }
          continue;
        }

        if (value === '') {
          inArray = true;
          continue;
        }

        // Strip quotes.
        value = value.replace(/^"(.*)"$/, '$1').replace(/\\"/g, '"');
        frontmatter[key] = value;
      }
    }
  }

  if (inArray) {
    frontmatter[currentKey] = [...arrayItems];
  }

  if (!frontmatter.tags) {
    frontmatter.tags = [];
  }

  return { frontmatter: frontmatter as unknown as BlogFrontmatter, body };
};

const writeFrontmatterField = (filePath: string, field: string, value: string) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const endIdx = lines.indexOf('---', 1);

  const existingIdx = lines.findIndex((line, idx) => idx > 0 && idx < endIdx && line.startsWith(`${field}:`));
  const newLine = `${field}: ${value}`;

  if (existingIdx >= 0) {
    lines[existingIdx] = newLine;
  } else {
    lines.splice(endIdx, 0, newLine);
  }

  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
};

const main = async () => {
  const publisher = new StandardSitePublisher({ handle, appPassword });
  await publisher.login();

  let agent: AtpAgent | undefined;
  if (shouldAnnounce) {
    agent = new AtpAgent({ service: 'https://bsky.social' });
    await agent.login({ identifier: handle, password: appPassword });
  }

  const blogDir = path.resolve(import.meta.dirname, '../src/content/blog');
  const files = fs.readdirSync(blogDir).filter((f) => f.endsWith('.md'));

  console.log(`Found ${files.length} blog posts`);
  if (dryRun) {
    console.log('DRY RUN — no records will be created\n');
  }

  for (const file of files) {
    const filePath = path.join(blogDir, file);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { frontmatter, body } = parseFrontmatter(raw);

    if (frontmatter.documentAtUri) {
      console.log(`  Skip (already synced): ${frontmatter.title}`);
      continue;
    }

    console.log(`  Publishing: ${frontmatter.title}`);

    const transformed = transformContent(body, { baseUrl: siteUrl });
    const postUrl = `${siteUrl}/blog/${frontmatter.slug}`;

    if (dryRun) {
      console.log(`    → Would publish document to AT Protocol`);
      console.log(`    → URL: ${postUrl}`);
      if (shouldAnnounce) {
        console.log(`    → Would create Bluesky announcement post`);
      }
      continue;
    }

    const docResult = await publisher.publishDocument({
      site: siteUrl,
      path: `/blog/${frontmatter.slug}`,
      title: frontmatter.title,
      description: frontmatter.description,
      content: {
        $type: 'site.standard.content.markdown',
        text: transformed.markdown,
        version: '1.0',
      },
      textContent: transformed.textContent,
      publishedAt: new Date(frontmatter.date).toISOString(),
      tags: frontmatter.tags,
    });

    console.log(`    → Document: ${docResult.uri}`);
    writeFrontmatterField(filePath, 'documentAtUri', docResult.uri);

    if (shouldAnnounce && agent) {
      const text = `New on the DXOS blog: ${frontmatter.title}\n\n${postUrl}`;
      const richText = new RichText({ text });
      await richText.detectFacets(agent);

      const bskyResult = await agent.post({
        text: richText.text,
        facets: richText.facets,
        createdAt: new Date().toISOString(),
      });

      const bskyPostUri = bskyResult.uri;
      console.log(`    → Bluesky post: ${bskyPostUri}`);
      writeFrontmatterField(filePath, 'bskyPostUri', bskyPostUri);
    }
  }

  console.log('\nSync complete.');
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
