#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//
// Script: remove build args from all ts-build package moon.yml files.
// The args have moved into tsdown.config.ts per package.
// Preserves other build task properties (deps, inputs, outputs).
//

import { parseDocument } from '/home/user/dxos/node_modules/yaml/dist/index.js';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../../..');

const result = execSync('grep -rl "ts-build" --include="moon.yml" .', {
  cwd: repoRoot,
  encoding: 'utf8',
});

const moonFiles = result.trim().split('\n').filter(Boolean);
console.log(`Processing ${moonFiles.length} ts-build packages.`);

let cleaned = 0;
let unchanged = 0;

for (const relPath of moonFiles) {
  const moonPath = join(repoRoot, relPath);
  const raw = readFileSync(moonPath, 'utf8');
  const doc = parseDocument(raw);

  const tasks = doc.get('tasks');
  if (!tasks) {
    unchanged++;
    continue;
  }

  const build = tasks.get('build');
  if (!build) {
    unchanged++;
    continue;
  }

  // Check if build has args.
  const buildMap = build;
  if (!buildMap || typeof buildMap.get !== 'function') {
    unchanged++;
    continue;
  }

  const argsNode = buildMap.get('args', true); // true = return node
  if (!argsNode) {
    unchanged++;
    continue;
  }

  // Remove args from build.
  buildMap.delete('args');

  // If build now has no remaining keys (is empty), remove the build task entirely.
  const remainingKeys = buildMap.items ? buildMap.items.filter((item) => item.key).map((i) => String(i.key)) : [];

  if (remainingKeys.length === 0) {
    tasks.delete('build');

    // If tasks is now empty, remove tasks entirely.
    const remainingTaskKeys = tasks.items ? tasks.items.filter((i) => i.key).map((i) => String(i.key)) : [];
    if (remainingTaskKeys.length === 0) {
      doc.delete('tasks');
    }
  }

  const newContent = doc.toString();
  if (newContent !== raw) {
    writeFileSync(moonPath, newContent);
    cleaned++;
  } else {
    unchanged++;
  }
}

console.log(`Cleaned ${cleaned} moon.yml files, ${unchanged} unchanged.`);
