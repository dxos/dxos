#!/usr/bin/env bun

//
// Copyright 2026 DXOS.org
//

// Pins the drawing skill and README to one pkg.pr.new build of `@dxos/drawing`, so agents run an immutable
// commit rather than the moving `@main`. Run after a drawing CLI change lands and pkg.pr.new has published it:
//   bun packages/devtools/drawing/scripts/pin-skill.ts <40-char commit sha>

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../../../..');
const FILES = ['skills/drawing/SKILL.md', 'packages/devtools/drawing/README.md'];
const PIN = /https:\/\/pkg\.pr\.new\/dxos\/dxos\/@dxos\/drawing@[0-9a-z]+/g;

const sha = process.argv[2];
if (!sha || !/^[0-9a-f]{40}$/.test(sha)) {
  console.error('Usage: pin-skill.ts <40-char commit sha>');
  process.exit(1);
}

const url = `https://pkg.pr.new/dxos/dxos/@dxos/drawing@${sha}`;
const response = await fetch(url, { method: 'HEAD' });
if (!response.ok) {
  console.error(`${url} answered ${response.status}; wait for pkg.pr.new to publish that commit.`);
  process.exit(1);
}

for (const file of FILES) {
  const target = path.join(root, file);
  const text = readFileSync(target, 'utf8');
  const pinned = text.replace(PIN, url);
  writeFileSync(target, pinned);
  console.log(`${file}: ${text === pinned ? 'unchanged' : 'pinned'}`);
}
