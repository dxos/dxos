#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//
// Script: generate tsdown.config.ts for every ts-build package.
// Reads each package's moon.yml, extracts the build args, and emits
// a tsdown.config.ts that imports from @dxos/dx-tsdown/config.
//

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../../..');

// Find all moon.yml files with ts-build tag.
const result = execSync('grep -rl "ts-build" --include="moon.yml" .', {
  cwd: repoRoot,
  encoding: 'utf8',
});

const moonFiles = result.trim().split('\n').filter(Boolean);
console.log(`Found ${moonFiles.length} ts-build packages.`);

let generated = 0;
let skipped = 0;

for (const relPath of moonFiles) {
  const moonPath = join(repoRoot, relPath);
  const pkgDir = dirname(moonPath);
  const configPath = join(pkgDir, 'tsdown.config.ts');

  const content = readFileSync(moonPath, 'utf8');

  // Parse build args from moon.yml.
  // We look for `  build:` section and extract the args indented under it.
  const buildSection = parseBuildSection(content);
  if (!buildSection) {
    // No build section means it inherits everything from tag-ts-build.yml with defaults.
    // Generate a minimal config.
    writeConfig(configPath, {});
    generated++;
    continue;
  }

  const opts = parseBuildArgs(buildSection);
  writeConfig(configPath, opts);
  generated++;
}

console.log(`Generated ${generated} tsdown.config.ts files (${skipped} skipped).`);

// ---------------------------------------------------------------------------

function parseBuildSection(content) {
  const lines = content.split('\n');
  let inBuild = false;
  const buildLines = [];
  const buildIndent = '  '; // build: is indented 2 spaces under tasks:

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!inBuild) {
      if (line.match(/^  build:\s*$/)) {
        inBuild = true;
      }
      continue;
    }
    // We're inside build: — collect lines that are indented further than build:.
    if (line.match(/^    /) || line.match(/^\s*$/)) {
      buildLines.push(line);
    } else if (line.match(/^  \S/)) {
      // Another top-level task — stop.
      break;
    }
  }

  return buildLines.length > 0 ? buildLines.join('\n') : null;
}

function parseBuildArgs(section) {
  const entryPoints = [];
  const platforms = [];
  let injectGlobals = false;
  let importGlobals = false;
  const bundlePackages = [];

  // Extract all quoted --flag=value strings.
  const argRe = /--(\w[\w-]*)(?:=(.+?))?(?=['"]|\s|$)/g;
  for (const match of section.matchAll(/'--([^']+)'/g)) {
    const full = match[1];
    const eqIdx = full.indexOf('=');
    const key = eqIdx >= 0 ? full.slice(0, eqIdx) : full;
    const val = eqIdx >= 0 ? full.slice(eqIdx + 1) : null;

    if (key === 'entryPoint' && val) {
      entryPoints.push(val);
    } else if (key === 'platform' && val) {
      platforms.push(val);
    } else if (key === 'injectGlobals') {
      injectGlobals = true;
    } else if (key === 'importGlobals') {
      importGlobals = true;
    } else if (key === 'bundlePackage' && val) {
      bundlePackages.push(val);
    }
    // Ignore outputPath — defaults to dist/lib in config.ts
  }

  return { entryPoints, platforms, injectGlobals, importGlobals, bundlePackages };
}

const DEFAULT_ENTRY = ['src/index.ts'];
const DEFAULT_PLATFORMS = ['browser', 'node'];

function isDefaultEntry(entry) {
  return entry.length === 1 && entry[0] === 'src/index.ts';
}

function isDefaultPlatforms(platforms) {
  if (platforms.length === 0) return true; // inherits default
  if (platforms.length !== 2) return false;
  return platforms.includes('browser') && platforms.includes('node');
}

function writeConfig(configPath, opts) {
  const { entryPoints = [], platforms = [], injectGlobals = false, importGlobals = false, bundlePackages = [] } = opts;

  const hasNonDefaultEntry = entryPoints.length > 0 && !isDefaultEntry(entryPoints);
  const hasNonDefaultPlatform = platforms.length > 0 && !isDefaultPlatforms(platforms);
  const hasFlags = injectGlobals || importGlobals || bundlePackages.length > 0;

  if (!hasNonDefaultEntry && !hasNonDefaultPlatform && !hasFlags) {
    // Minimal config — all defaults.
    writeFileSync(
      configPath,
      [
        '// Copyright 2026 DXOS.org',
        '',
        "import { defineConfig } from '@dxos/dx-tsdown/config';",
        '',
        'export default defineConfig();',
        '',
      ].join('\n'),
    );
    return;
  }

  const parts = [];
  if (hasNonDefaultEntry) {
    parts.push(`  entry: ${JSON.stringify(entryPoints)},`);
  }
  if (hasNonDefaultPlatform) {
    parts.push(`  platform: ${JSON.stringify(platforms)},`);
  }
  if (injectGlobals) {
    parts.push('  injectGlobals: true,');
  }
  if (importGlobals) {
    parts.push('  importGlobals: true,');
  }
  if (bundlePackages.length > 0) {
    parts.push(`  bundlePackages: ${JSON.stringify(bundlePackages)},`);
  }

  writeFileSync(
    configPath,
    [
      '// Copyright 2026 DXOS.org',
      '',
      "import { defineConfig } from '@dxos/dx-tsdown/config';",
      '',
      'export default defineConfig({',
      ...parts,
      '});',
      '',
    ].join('\n'),
  );
}
