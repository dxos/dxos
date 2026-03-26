#!/usr/bin/env npx tsx
//
// Copyright 2026 DXOS.org
//
// One-time script: creates a Standard.site publication record on your AT Protocol PDS.
//
// Required env vars:
//   ATPROTO_HANDLE    - Your Bluesky handle (e.g., dxos.org)
//   ATPROTO_APP_PASSWORD - An app password from https://bsky.app/settings/app-passwords
//
// Usage: ATPROTO_HANDLE=dxos.org ATPROTO_APP_PASSWORD=xxxx npx tsx docs/scripts/create-publication.ts
//

import { StandardSitePublisher } from '@bryanguffey/astro-standard-site/publisher';

const handle = process.env.ATPROTO_HANDLE;
const appPassword = process.env.ATPROTO_APP_PASSWORD;

if (!handle || !appPassword) {
  console.error('Required env vars: ATPROTO_HANDLE, ATPROTO_APP_PASSWORD');
  process.exit(1);
}

const main = async () => {
  const publisher = new StandardSitePublisher({ handle, appPassword });
  await publisher.login();

  const result = await publisher.publishPublication({
    name: 'DXOS Blog',
    url: 'https://dxos.org',
    description: 'News, engineering deep-dives, and updates from the DXOS team. Building the new standard for collaborative local-first software.',
    basicTheme: {
      background: { r: 10, g: 10, b: 10 },
      foreground: { r: 230, g: 237, b: 243 },
      accent: { r: 0, g: 209, b: 178 },
      accentForeground: { r: 255, g: 255, b: 255 },
    },
  });

  const publicationRkey = result.uri.split('/').pop();
  console.log('Publication created:');
  console.log(`  AT-URI: ${result.uri}`);
  console.log(`  CID: ${result.cid}`);
  console.log(`  Publication rkey: ${publicationRkey}`);
  console.log('');
  console.log('Add these to your environment:');
  console.log(`  ATPROTO_DID=<your DID>`);
  console.log(`  ATPROTO_PUBLICATION_RKEY=${publicationRkey}`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
