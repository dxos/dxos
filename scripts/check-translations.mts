#!/usr/bin/env npx tsx
//
// Prototype: Translation key checker for DXOS plugins.
// Scans packages/plugins/ to find missing and unused translation keys.
//
// Usage: npx tsx scripts/check-translations.mts [--fail-on-missing] [--fail-on-unused]
//

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname, basename } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const PLUGINS_DIR = join(ROOT, 'packages/plugins');
const UI_DIR = join(ROOT, 'packages/ui');
const SDK_DIR = join(ROOT, 'packages/sdk');

// --- Step 1: Collect defined translation keys from translations.ts files ---

interface DefinedKey {
  namespace: string;
  key: string;
  file: string;
}

interface UsedKey {
  namespace: string | null;
  key: string;
  file: string;
  line: number;
}

/** Resolve meta.id for a plugin by reading its meta.ts. */
function resolveMetaId(pluginDir: string): string | null {
  const metaPath = join(pluginDir, 'src/meta.ts');
  if (!existsSync(metaPath)) {
    return null;
  }
  const content = readFileSync(metaPath, 'utf-8');
  const match = content.match(/id:\s*['"]([^'"]+)['"]/);
  return match ? match[1] : null;
}

/** Resolve translationKey for a UI package from its translations.ts. */
function resolveTranslationKey(packageDir: string): string | null {
  const translationsPath = join(packageDir, 'src/translations.ts');
  if (!existsSync(translationsPath)) {
    return null;
  }
  const content = readFileSync(translationsPath, 'utf-8');
  const match = content.match(/export\s+const\s+translationKey\s*=\s*['"]([^'"]+)['"]/);
  return match ? match[1] : null;
}

/** Walk directory tree yielding file paths matching a filter. */
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

/** Extract defined keys from a translations.ts file. */
function extractDefinedKeys(filePath: string, packageDir: string, namespace: string | null): DefinedKey[] {
  const content = readFileSync(filePath, 'utf-8');
  const keys: DefinedKey[] = [];

  // Match namespace blocks: [meta.id]: { ... } or [translationKey]: { ... } or [SomeType.typename]: { ... } or 'literal': { ... }

  const lines = content.split('\n');
  let currentNamespace: string | null = null;
  let braceDepth = 0;
  let inNamespaceBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect namespace header patterns.
    // Pattern 1: [meta.id]: { or [translationKey]: {
    if (trimmed.match(/\[meta\.id\]\s*:\s*\{/) || trimmed.match(/\[translationKey\]\s*:\s*\{/)) {
      currentNamespace = namespace;
      inNamespaceBlock = true;
      braceDepth = 1;
      continue;
    }

    // Pattern 2: [SomeExpression]: { (typename-based namespaces)
    const typeNameMatch = trimmed.match(/\[([^\]]+)\]\s*:\s*\{/);
    if (typeNameMatch && !inNamespaceBlock) {
      // For typename-based namespaces, use the expression as-is for now.
      // These are things like Collection.Collection.typename, Markdown.Document.typename, etc.
      currentNamespace = `<dynamic:${typeNameMatch[1]}>`;
      inNamespaceBlock = true;
      braceDepth = 1;
      continue;
    }

    // Pattern 3: 'literal-namespace': {
    const literalNsMatch = trimmed.match(/^['"]([^'"]+)['"]\s*:\s*\{/);
    if (literalNsMatch && !inNamespaceBlock) {
      currentNamespace = literalNsMatch[1];
      inNamespaceBlock = true;
      braceDepth = 1;
      continue;
    }

    if (inNamespaceBlock && currentNamespace) {
      // Track brace depth.
      for (const ch of trimmed) {
        if (ch === '{') {
          braceDepth++;
        }
        if (ch === '}') {
          braceDepth--;
        }
      }

      // Extract key-value pairs: 'some key': 'some value' or 'some key': ...
      const keyMatch = trimmed.match(/^['"]([^'"]+)['"]\s*:/);
      if (keyMatch && braceDepth >= 1) {
        keys.push({
          namespace: currentNamespace,
          key: keyMatch[1],
          file: filePath,
        });
      }

      if (braceDepth <= 0) {
        inNamespaceBlock = false;
        currentNamespace = null;
      }
    }
  }

  return keys;
}

/** Extract used translation keys from source files. */
function extractUsedKeys(filePath: string, packageNamespace: string | null): UsedKey[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const keys: UsedKey[] = [];

  // Determine namespace from useTranslation call.
  let defaultNamespace: string | null = null;

  // Check for useTranslation(meta.id) or useTranslation(translationKey).
  if (content.includes('useTranslation(meta.id)') || content.includes('useTranslation(translationKey)')) {
    defaultNamespace = packageNamespace;
  }

  // Check for useTranslation('literal') or useTranslation("literal").
  const literalNsMatch = content.match(/useTranslation\(\s*['"]([^'"]+)['"]\s*\)/);
  if (literalNsMatch) {
    defaultNamespace = literalNsMatch[1];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Pattern 1: t('key') or t("key") — simple key usage.
    const tCallRegex = /\bt\(\s*['"]([^'"]+)['"]\s*(?:,\s*\{([^}]*)\})?\s*\)/g;
    let match;
    while ((match = tCallRegex.exec(line)) !== null) {
      const key = match[1];
      const opts = match[2] || '';

      // Check for namespace override: { ns: something }
      let namespace = defaultNamespace;
      const nsOverride = opts.match(/ns:\s*['"]([^'"]+)['"]/);
      if (nsOverride) {
        namespace = nsOverride[1];
      }
      // Check for ns: osTranslations (variable reference).
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

      // Resolve known variable names.
      if (namespace === 'meta.id' || namespace === 'meta' || namespace === 'translationKey') {
        namespace = packageNamespace;
      } else if (namespace === 'osTranslations') {
        namespace = 'org.dxos.i18n.os';
      } else {
        // Strip quotes if literal.
        namespace = namespace.replace(/['"]/g, '');
      }

      keys.push({ namespace, key, file: filePath, line: i + 1 });
    }
  }

  return keys;
}

// --- Normalization ---

/** Valid suffixes that every translation key should end with. */
const VALID_SUFFIXES = [
  'alt',
  'button',
  'description',
  'heading',
  'icon',
  'label',
  'menu',
  'message',
  'name',
  'placeholder',
  'title',
  'value',
] as const;

/** Plural suffixes appended by i18next. */
const PLURAL_SUFFIXES = ['_zero', '_one', '_other'] as const;

/** Strip plural suffix to get the base key for normalization. */
const stripPluralSuffix = (key: string): string => {
  for (const suffix of PLURAL_SUFFIXES) {
    if (key.endsWith(suffix)) {
      return key.slice(0, -suffix.length);
    }
  }
  return key;
};

/** Check if a key ends with a valid suffix (ignoring plural suffixes). */
const hasValidSuffix = (key: string): boolean => {
  const base = stripPluralSuffix(key);
  return VALID_SUFFIXES.some((suffix) => base.endsWith(` ${suffix}`) || base === suffix);
};

/** Convert a space-separated key to dot.kebab-case format. */
const toDotNotation = (key: string): string => {
  const parts = key.split(' ');
  if (parts.length <= 1) {
    return key;
  }

  // Strategy: the last word is the suffix/type, everything else forms the path.
  const suffix = parts[parts.length - 1];
  const pathParts = parts.slice(0, -1);

  if (pathParts.length === 0) {
    return suffix;
  }

  // Try to detect natural grouping by known prefix words.
  const prefixWords = [
    'settings',
    'column',
    'range',
    'trigger',
    'message',
    'draft',
    'script',
    'deployment',
    'notebook',
  ];
  const firstWord = pathParts[0];
  if (prefixWords.includes(firstWord) && pathParts.length > 1) {
    return `${firstWord}.${pathParts.slice(1).join('-')}.${suffix}`;
  }

  return `${pathParts.join('-')}.${suffix}`;
};

interface NormalizationIssue {
  namespace: string;
  key: string;
  file: string;
  issue: 'missing-suffix' | 'non-hierarchical';
  suggestion?: string;
}

/** Check keys for normalization issues. */
function checkNormalization(definedKeys: DefinedKey[]): NormalizationIssue[] {
  const issues: NormalizationIssue[] = [];

  for (const dk of definedKeys) {
    const base = stripPluralSuffix(dk.key);

    // Check 1: Missing valid suffix.
    if (!hasValidSuffix(dk.key)) {
      issues.push({
        namespace: dk.namespace,
        key: dk.key,
        file: dk.file,
        issue: 'missing-suffix',
        suggestion: `Consider adding a suffix: ${VALID_SUFFIXES.join(', ')}`,
      });
    }

    // Check 2: Space-separated key that could use dot notation.
    if (base.includes(' ')) {
      issues.push({
        namespace: dk.namespace,
        key: dk.key,
        file: dk.file,
        issue: 'non-hierarchical',
        suggestion: toDotNotation(dk.key),
      });
    }
  }

  return issues;
}

/** Check for incomplete plural sets. */
function checkPlurals(
  definedKeys: DefinedKey[],
): { namespace: string; baseKey: string; file: string; missing: string[] }[] {
  const pluralSuffixes = ['_zero', '_one', '_other'];
  const issues: { namespace: string; baseKey: string; file: string; missing: string[] }[] = [];

  // Group keys by namespace.
  const byNamespace = new Map<string, Map<string, DefinedKey>>();
  for (const dk of definedKeys) {
    if (!byNamespace.has(dk.namespace)) {
      byNamespace.set(dk.namespace, new Map());
    }
    byNamespace.get(dk.namespace)!.set(dk.key, dk);
  }

  for (const [ns, keyMap] of byNamespace) {
    // Find keys that have any plural suffix.
    const baseKeys = new Set<string>();
    for (const key of keyMap.keys()) {
      for (const suffix of pluralSuffixes) {
        if (key.endsWith(suffix)) {
          baseKeys.add(key.slice(0, -suffix.length));
        }
      }
    }

    for (const baseKey of baseKeys) {
      const missing: string[] = [];
      for (const suffix of pluralSuffixes) {
        if (!keyMap.has(baseKey + suffix)) {
          missing.push(baseKey + suffix);
        }
      }
      if (missing.length > 0) {
        const anyExisting = pluralSuffixes.map((s) => keyMap.get(baseKey + s)).find((dk) => dk !== undefined);
        issues.push({
          namespace: ns,
          baseKey,
          file: anyExisting?.file ?? '<unknown>',
          missing,
        });
      }
    }
  }

  return issues;
}

// --- Main ---

function main() {
  console.log('Translation Key Checker\n');
  console.log('Scanning packages/plugins/ and packages/ui/...\n');

  const allDefinedKeys: DefinedKey[] = [];
  const allUsedKeys: UsedKey[] = [];

  // --- Scan plugins ---
  const pluginDirs = readdirSync(PLUGINS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith('plugin-'))
    .map((d) => join(PLUGINS_DIR, d.name));

  for (const pluginDir of pluginDirs) {
    const metaId = resolveMetaId(pluginDir);

    for (const file of walkFiles(join(pluginDir, 'src'), (p) => basename(p) === 'translations.ts')) {
      const keys = extractDefinedKeys(file, pluginDir, metaId);
      allDefinedKeys.push(...keys);
    }

    for (const file of walkFiles(
      join(pluginDir, 'src'),
      (p) => /\.(tsx?|jsx?)$/.test(p) && !p.includes('.test.') && !p.includes('.stories.'),
    )) {
      const keys = extractUsedKeys(file, metaId);
      allUsedKeys.push(...keys);
    }
  }

  // --- Scan UI packages ---
  const uiDirs = existsSync(UI_DIR)
    ? readdirSync(UI_DIR, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => join(UI_DIR, d.name))
    : [];

  for (const uiDir of uiDirs) {
    const translationKey = resolveTranslationKey(uiDir);
    if (!translationKey) {
      continue;
    }

    for (const file of walkFiles(join(uiDir, 'src'), (p) => basename(p) === 'translations.ts')) {
      const keys = extractDefinedKeys(file, uiDir, translationKey);
      allDefinedKeys.push(...keys);
    }

    for (const file of walkFiles(
      join(uiDir, 'src'),
      (p) => /\.(tsx?|jsx?)$/.test(p) && !p.includes('.test.') && !p.includes('.stories.'),
    )) {
      const keys = extractUsedKeys(file, translationKey);
      allUsedKeys.push(...keys);
    }
  }

  // --- Scan SDK packages ---
  const sdkDirs = existsSync(SDK_DIR)
    ? readdirSync(SDK_DIR, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => join(SDK_DIR, d.name))
    : [];

  for (const sdkDir of sdkDirs) {
    const translationKey = resolveTranslationKey(sdkDir);
    if (!translationKey) {
      continue;
    }

    for (const file of walkFiles(join(sdkDir, 'src'), (p) => basename(p) === 'translations.ts')) {
      const keys = extractDefinedKeys(file, sdkDir, translationKey);
      allDefinedKeys.push(...keys);
    }

    for (const file of walkFiles(
      join(sdkDir, 'src'),
      (p) => /\.(tsx?|jsx?)$/.test(p) && !p.includes('.test.') && !p.includes('.stories.'),
    )) {
      const keys = extractUsedKeys(file, translationKey);
      allUsedKeys.push(...keys);
    }
  }

  const totalPackages =
    pluginDirs.length +
    uiDirs.filter((d) => resolveTranslationKey(d)).length +
    sdkDirs.filter((d) => resolveTranslationKey(d)).length;
  console.log(`Found ${allDefinedKeys.length} defined translation keys across ${totalPackages} packages.`);
  console.log(`Found ${allUsedKeys.length} translation key usages in source files.\n`);

  // Build defined key set (only for meta.id namespaces, skip dynamic typename namespaces).
  const definedSet = new Set<string>();
  const definedByNsKey = new Map<string, DefinedKey>();
  for (const dk of allDefinedKeys) {
    const id = `${dk.namespace}::${dk.key}`;
    definedSet.add(id);
    definedByNsKey.set(id, dk);
  }

  // Build used key set.
  const usedSet = new Set<string>();
  const usedByNsKey = new Map<string, UsedKey[]>();
  for (const uk of allUsedKeys) {
    if (!uk.namespace) {
      continue; // Skip keys where we couldn't resolve the namespace.
    }
    const id = `${uk.namespace}::${uk.key}`;
    usedSet.add(id);
    if (!usedByNsKey.has(id)) {
      usedByNsKey.set(id, []);
    }
    usedByNsKey.get(id)!.push(uk);
  }

  // --- Missing keys: used but not defined ---
  const missingKeys = [...usedSet].filter((id) => !definedSet.has(id));
  console.log('='.repeat(60));
  console.log(`MISSING KEYS (used in code but not defined): ${missingKeys.length}`);
  console.log('='.repeat(60));
  for (const id of missingKeys.sort()) {
    const [ns, key] = id.split('::');
    const usages = usedByNsKey.get(id) ?? [];
    const location = usages[0] ? `${relative(ROOT, usages[0].file)}:${usages[0].line}` : '';
    console.log(`  [${ns}] "${key}"  (${location}${usages.length > 1 ? ` +${usages.length - 1} more` : ''})`);
  }

  // --- Unused keys: defined but not used (only for resolvable namespaces) ---
  const unusedKeys = [...definedSet].filter((id) => !usedSet.has(id)).filter((id) => !id.startsWith('<dynamic:')); // Skip typename-based namespaces (used dynamically).
  console.log(`\n${'='.repeat(60)}`);
  console.log(`UNUSED KEYS (defined but not used in code): ${unusedKeys.length}`);
  console.log('='.repeat(60));
  for (const id of unusedKeys.sort()) {
    const [ns, key] = id.split('::');
    const dk = definedByNsKey.get(id);
    const location = dk ? relative(ROOT, dk.file) : '';
    console.log(`  [${ns}] "${key}"  (${location})`);
  }

  // --- Incomplete plurals ---
  const pluralIssues = checkPlurals(allDefinedKeys);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`INCOMPLETE PLURALS: ${pluralIssues.length}`);
  console.log('='.repeat(60));
  for (const issue of pluralIssues) {
    console.log(
      `  [${issue.namespace}] "${issue.baseKey}" missing: ${issue.missing.join(', ')}  (${relative(ROOT, issue.file)})`,
    );
  }

  // --- Normalization issues ---
  const normIssues = checkNormalization(allDefinedKeys);
  const missingSuffixIssues = normIssues.filter((i) => i.issue === 'missing-suffix');
  const nonHierarchicalIssues = normIssues.filter((i) => i.issue === 'non-hierarchical');

  console.log(`\n${'='.repeat(60)}`);
  console.log(`MISSING SUFFIX (${missingSuffixIssues.length} keys lack a type suffix)`);
  console.log(`Valid suffixes: ${VALID_SUFFIXES.join(', ')}`);
  console.log('='.repeat(60));
  for (const issue of missingSuffixIssues.sort((a, b) =>
    `${a.namespace}::${a.key}`.localeCompare(`${b.namespace}::${b.key}`),
  )) {
    console.log(`  [${issue.namespace}] "${issue.key}"  (${relative(ROOT, issue.file)})`);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`NORMALIZATION SUGGESTIONS (${nonHierarchicalIssues.length} keys → dot.camelCase)`);
  console.log('='.repeat(60));
  // Group by namespace for readability.
  const normByNs = new Map<string, NormalizationIssue[]>();
  for (const issue of nonHierarchicalIssues) {
    if (!normByNs.has(issue.namespace)) {
      normByNs.set(issue.namespace, []);
    }
    normByNs.get(issue.namespace)!.push(issue);
  }
  for (const [ns, issues] of [...normByNs.entries()].sort()) {
    console.log(`\n  [${ns}]`);
    for (const issue of issues) {
      console.log(`    "${issue.key}" → "${issue.suggestion}"`);
    }
  }

  // --- Unresolved usages (namespace couldn't be determined) ---
  const unresolvedUsages = allUsedKeys.filter((uk) => !uk.namespace);
  if (unresolvedUsages.length > 0) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`UNRESOLVED USAGES (namespace unknown): ${unresolvedUsages.length}`);
    console.log('='.repeat(60));
    const byFile = new Map<string, UsedKey[]>();
    for (const uk of unresolvedUsages) {
      const rel = relative(ROOT, uk.file);
      if (!byFile.has(rel)) {
        byFile.set(rel, []);
      }
      byFile.get(rel)!.push(uk);
    }
    for (const [file, usages] of [...byFile.entries()].sort()) {
      console.log(`  ${file}: ${usages.map((u) => `"${u.key}" (line ${u.line})`).join(', ')}`);
    }
  }

  // --- Summary ---
  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`  Packages scanned:     ${totalPackages}`);
  console.log(`  Defined keys:         ${allDefinedKeys.length}`);
  console.log(`  Used keys:            ${allUsedKeys.length}`);
  console.log(`  Missing keys:         ${missingKeys.length}`);
  console.log(`  Unused keys:          ${unusedKeys.length}`);
  console.log(`  Incomplete plurals:   ${pluralIssues.length}`);
  console.log(`  Missing suffix:       ${missingSuffixIssues.length}`);
  console.log(`  Non-hierarchical:     ${nonHierarchicalIssues.length}`);
  console.log(`  Unresolved usages:    ${unresolvedUsages.length}`);

  // --- CI exit codes ---
  const args = process.argv.slice(2);
  const failOnMissing = args.includes('--fail-on-missing');
  const failOnUnused = args.includes('--fail-on-unused');

  let exitCode = 0;
  if (failOnMissing && missingKeys.length > 0) {
    console.log(`\nFailing: ${missingKeys.length} missing keys found.`);
    exitCode = 1;
  }
  if (failOnUnused && unusedKeys.length > 0) {
    console.log(`\nFailing: ${unusedKeys.length} unused keys found.`);
    exitCode = 1;
  }
  process.exit(exitCode);
}

main();
