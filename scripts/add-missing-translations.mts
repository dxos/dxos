#!/usr/bin/env npx tsx
//
// Adds missing translation keys to the associated translations.ts files.
// Keys are inserted with a TODO placeholder value.
//
// Usage: npx tsx scripts/add-missing-translations.mts [--dry-run]
//

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative, dirname, basename } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const PLUGINS_DIR = join(ROOT, 'packages/plugins');
const UI_DIR = join(ROOT, 'packages/ui');
const SDK_DIR = join(ROOT, 'packages/sdk');
const DRY_RUN = process.argv.includes('--dry-run');

// --- Reused from check-translations.mts ---

interface UsedKey {
  namespace: string | null;
  key: string;
  file: string;
  line: number;
}

function resolveMetaId(pluginDir: string): string | null {
  const metaPath = join(pluginDir, 'src/meta.ts');
  if (!existsSync(metaPath)) {
    return null;
  }
  const content = readFileSync(metaPath, 'utf-8');
  const match = content.match(/id:\s*['"]([^'"]+)['"]/);
  return match ? match[1] : null;
}

function resolveTranslationKey(packageDir: string): string | null {
  const translationsPath = join(packageDir, 'src/translations.ts');
  if (!existsSync(translationsPath)) {
    return null;
  }
  const content = readFileSync(translationsPath, 'utf-8');
  const match = content.match(/export\s+const\s+translationKey\s*=\s*['"]([^'"]+)['"]/);
  return match ? match[1] : null;
}

function* walkFiles(dir: string, filter: (path: string) => boolean): Generator<string> {
  if (!existsSync(dir)) {
    return;
  }
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.next') {
        continue;
      }
      yield* walkFiles(fullPath, filter);
    } else if (filter(fullPath)) {
      yield fullPath;
    }
  }
}

function extractUsedKeys(filePath: string, packageNamespace: string | null): UsedKey[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const keys: UsedKey[] = [];

  let defaultNamespace: string | null = null;
  if (content.includes('useTranslation(meta.id)') || content.includes('useTranslation(translationKey)')) {
    defaultNamespace = packageNamespace;
  }
  const literalNsMatch = content.match(/useTranslation\(\s*['"]([^'"]+)['"]\s*\)/);
  if (literalNsMatch) {
    defaultNamespace = literalNsMatch[1];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const tCallRegex = /\bt\(\s*['"]([^'"]+)['"]\s*(?:,\s*\{([^}]*)\})?\s*\)/g;
    let match;
    while ((match = tCallRegex.exec(line)) !== null) {
      const key = match[1];
      const opts = match[2] || '';
      let namespace = defaultNamespace;
      const nsOverride = opts.match(/ns:\s*['"]([^'"]+)['"]/);
      if (nsOverride) {
        namespace = nsOverride[1];
      }
      const nsVarOverride = opts.match(/ns:\s*osTranslations/);
      if (nsVarOverride) {
        namespace = 'org.dxos.i18n.os';
      }
      keys.push({ namespace, key, file: filePath, line: i + 1 });
    }

    // Pattern 2: Label tuple — ['key', { ns: something }]
    const labelRegex = /\[\s*['"]([^'"]+)['"]\s*,\s*\{\s*ns:\s*([\w.]+|['"][^'"]+['"])/g;
    while ((match = labelRegex.exec(line)) !== null) {
      const key = match[1];
      let namespace: string | null = match[2];
      if (namespace === 'meta.id' || namespace === 'meta' || namespace === 'translationKey') {
        namespace = packageNamespace;
      } else if (namespace === 'osTranslations') {
        namespace = 'org.dxos.i18n.os';
      } else {
        namespace = namespace.replace(/['"]/g, '');
      }
      keys.push({ namespace, key, file: filePath, line: i + 1 });
    }
  }

  return keys;
}

/** Extract defined keys for a specific namespace from a translations.ts file. */
function extractDefinedKeysForNamespace(translationsPath: string, nsSource: string): Set<string> {
  const keys = new Set<string>();
  if (!existsSync(translationsPath)) {
    return keys;
  }

  const content = readFileSync(translationsPath, 'utf-8');
  const lines = content.split('\n');
  let inBlock = false;
  let braceDepth = 0;

  const blockPattern = nsSource === 'meta.id'
    ? /\[meta\.id\]\s*:\s*\{/
    : /\[translationKey\]\s*:\s*\{/;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!inBlock && trimmed.match(blockPattern)) {
      inBlock = true;
      braceDepth = 1;
      continue;
    }

    if (inBlock) {
      for (const ch of trimmed) {
        if (ch === '{') {
          braceDepth++;
        }
        if (ch === '}') {
          braceDepth--;
        }
      }

      const keyMatch = trimmed.match(/^['"]([^'"]+)['"]\s*:/);
      if (keyMatch && braceDepth >= 1) {
        keys.add(keyMatch[1]);
      }

      if (braceDepth <= 0) {
        inBlock = false;
      }
    }
  }

  return keys;
}

/** Insert missing keys into a translations.ts file's namespace block. */
function insertKeys(translationsPath: string, nsSource: string, missingKeys: string[]): boolean {
  if (!existsSync(translationsPath)) {
    return false;
  }

  const content = readFileSync(translationsPath, 'utf-8');
  const lines = content.split('\n');

  const blockPattern = nsSource === 'meta.id'
    ? /\[meta\.id\]\s*:\s*\{/
    : /\[translationKey\]\s*:\s*\{/;

  // Find the namespace block and its closing brace.
  let blockStart = -1;
  let blockEnd = -1;
  let braceDepth = 0;
  let indent = '';

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (blockStart === -1 && trimmed.match(blockPattern)) {
      blockStart = i;
      braceDepth = 1;
      continue;
    }

    if (blockStart !== -1 && blockEnd === -1) {
      for (const ch of trimmed) {
        if (ch === '{') {
          braceDepth++;
        }
        if (ch === '}') {
          braceDepth--;
        }
      }

      // Detect indent from existing keys.
      const keyMatch = trimmed.match(/^['"]([^'"]+)['"]\s*:/);
      if (keyMatch && !indent) {
        indent = lines[i].match(/^(\s*)/)?.[1] ?? '        ';
      }

      if (braceDepth <= 0) {
        blockEnd = i;
        break;
      }
    }
  }

  if (blockStart === -1 || blockEnd === -1) {
    return false;
  }

  if (!indent) {
    indent = '        ';
  }

  // Insert keys before the closing brace.
  const newLines = missingKeys.map((key) => `${indent}'${key}': '',`);
  lines.splice(blockEnd, 0, ...newLines);

  if (!DRY_RUN) {
    writeFileSync(translationsPath, lines.join('\n'));
  }

  return true;
}

// --- Main ---

interface PackageInfo {
  dir: string;
  namespace: string;
  nsSource: 'meta.id' | 'translationKey';
  translationsPath: string;
}

function main() {
  console.log(DRY_RUN ? 'DRY RUN — no files will be modified.\n' : '');

  const packages: PackageInfo[] = [];

  // Collect plugins.
  const pluginDirs = readdirSync(PLUGINS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith('plugin-'))
    .map((d) => join(PLUGINS_DIR, d.name));

  for (const dir of pluginDirs) {
    const ns = resolveMetaId(dir);
    if (ns) {
      packages.push({ dir, namespace: ns, nsSource: 'meta.id', translationsPath: join(dir, 'src/translations.ts') });
    }
  }

  // Collect UI packages.
  if (existsSync(UI_DIR)) {
    const uiDirs = readdirSync(UI_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => join(UI_DIR, d.name));

    for (const dir of uiDirs) {
      const ns = resolveTranslationKey(dir);
      if (ns) {
        packages.push({ dir, namespace: ns, nsSource: 'translationKey', translationsPath: join(dir, 'src/translations.ts') });
      }
    }
  }

  // Collect SDK packages (e.g., shell).
  if (existsSync(SDK_DIR)) {
    const sdkDirs = readdirSync(SDK_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => join(SDK_DIR, d.name));

    for (const dir of sdkDirs) {
      const ns = resolveTranslationKey(dir);
      if (ns) {
        packages.push({ dir, namespace: ns, nsSource: 'translationKey', translationsPath: join(dir, 'src/translations.ts') });
      }
    }
  }

  let totalAdded = 0;
  let totalSkipped = 0;

  for (const pkg of packages) {
    // Collect all used keys for this package's namespace.
    const usedKeys = new Set<string>();
    for (const file of walkFiles(join(pkg.dir, 'src'), (p) => /\.(tsx?|jsx?)$/.test(p) && !p.includes('.test.') && !p.includes('.stories.'))) {
      for (const uk of extractUsedKeys(file, pkg.namespace)) {
        if (uk.namespace === pkg.namespace) {
          usedKeys.add(uk.key);
        }
      }
    }

    // Get defined keys.
    const definedKeys = extractDefinedKeysForNamespace(pkg.translationsPath, pkg.nsSource);

    // Find missing.
    const missing = [...usedKeys].filter((key) => !definedKeys.has(key)).sort();
    if (missing.length === 0) {
      continue;
    }

    const pkgName = relative(ROOT, pkg.dir);
    console.log(`${pkgName} (+${missing.length})`);
    for (const key of missing) {
      console.log(`  '${key}': '',`);
    }

    if (insertKeys(pkg.translationsPath, pkg.nsSource, missing)) {
      totalAdded += missing.length;
      console.log(`  → ${DRY_RUN ? 'would add to' : 'added to'} ${relative(ROOT, pkg.translationsPath)}`);
    } else {
      totalSkipped += missing.length;
      console.log(`  → SKIPPED (no ${pkg.nsSource} block found)`);
    }
    console.log('');
  }

  console.log(`${DRY_RUN ? 'Would add' : 'Added'} ${totalAdded} keys. Skipped ${totalSkipped}.`);
}

main();
