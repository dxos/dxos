#!/usr/bin/env node
/**
 * Migrates @dxos/effect imports to use EffectEx and SchemaEx namespaces.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';

const EFFECT_EX_SYMBOLS = new Set([
  'causeToError',
  'throwCause',
  'unwrapExit',
  'runAndForwardErrors',
  'runInRuntime',
  'promiseWithCauseCapture',
  'acquireReleaseResource',
  'contextFromScope',
  'asyncTaskTaggingLayer',
]);

const SCHEMA_EX_SYMBOLS = new Set([
  'getBaseType',
  'SchemaProperty',
  'getProperties',
  'visit',
  'findNode',
  'findProperty',
  'getAnnotation',
  'findAnnotation',
  'isOption',
  'isLiteralUnion',
  'getLiteralValues',
  'isArrayType',
  'getArrayElementType',
  'isTupleType',
  'isDiscriminatedUnion',
  'getDiscriminatingProps',
  'getDiscriminatedType',
  'isNestedType',
  'mapAst',
  'VisitResult',
  'Path',
  'TestFn',
  'VisitorFn',
  'JsonPath',
  'JsonProp',
  'isJsonPath',
  'createJsonPath',
  'fromEffectValidationPath',
  'splitJsonPath',
  'getField',
  'getValue',
  'setValue',
  'UrlParser',
  'getParamKeyAnnotation',
  'ParamKeyAnnotation',
]);

const ROOT = '/home/user/dxos/packages';
const SKIP_DIR = '/home/user/dxos/packages/common/effect/src';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Parse "{ type X, Y as Z, W }" into specifier objects. */
function parseSpecifiers(raw) {
  const result = [];
  // Tokenise: split by comma, then parse each token
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const part of parts) {
    const m = part.match(/^(type\s+)?(\w+)(?:\s+as\s+(\w+))?$/);
    if (!m) continue;
    result.push({ isType: !!m[1], name: m[2], alias: m[3] || null });
  }
  return result;
}

/** Format a specifier back to string. */
function fmt(spec) {
  return (spec.isType ? 'type ' : '') + spec.name + (spec.alias ? ` as ${spec.alias}` : '');
}

/** Group specifiers by target namespace. */
function group(specs) {
  const effectEx = [],
    schemaEx = [],
    remaining = [];
  for (const s of specs) {
    if (EFFECT_EX_SYMBOLS.has(s.name)) effectEx.push(s);
    else if (SCHEMA_EX_SYMBOLS.has(s.name)) schemaEx.push(s);
    else remaining.push(s);
  }
  return { effectEx, schemaEx, remaining };
}

// ─── Import block replacement ─────────────────────────────────────────────────

/**
 * Given file content, transforms all `import { ... } from '@dxos/effect'` blocks.
 * Returns { content, effectExSpecs, schemaExSpecs, needsEffectEx, needsSchemaEx }.
 */
function transformImportBlocks(content) {
  // Match possibly multi-line import block.
  // We use a stateful approach: find the start, then scan for the closing '}'.
  const PREFIX = "from '@dxos/effect'";
  let result = content;
  let allEffectExSpecs = [];
  let allSchemaExSpecs = [];

  // We need to find all `import { ... } from '@dxos/effect';` blocks.
  // Strategy: scan forward, find "import {", accumulate until "}", then check if followed by "from '@dxos/effect'"
  let searchFrom = 0;
  const replacements = []; // {start, end, replacement}

  while (true) {
    // Find next "import {" or "import type {"
    const importStart = result.indexOf('import {', searchFrom);
    const importTypeStart = result.indexOf('import type {', searchFrom);

    let blockStart = -1;
    let isTypeImport = false;

    if (importStart === -1 && importTypeStart === -1) break;
    if (importStart === -1) {
      blockStart = importTypeStart;
      isTypeImport = true;
    } else if (importTypeStart === -1) {
      blockStart = importStart;
    } else if (importTypeStart < importStart) {
      blockStart = importTypeStart;
      isTypeImport = true;
    } else {
      blockStart = importStart;
    }

    // Find the opening brace
    const braceOpen = result.indexOf('{', blockStart);
    if (braceOpen === -1) break;

    // Find the matching closing brace
    const braceClose = result.indexOf('}', braceOpen);
    if (braceClose === -1) break;

    const afterClose = result.indexOf(';', braceClose);
    if (afterClose === -1) {
      searchFrom = braceClose + 1;
      continue;
    }

    const blockText = result.substring(blockStart, afterClose + 1);

    // Check if this import is from '@dxos/effect'
    if (!blockText.includes("from '@dxos/effect'")) {
      searchFrom = braceClose + 1;
      continue;
    }

    // Extract specifier string
    const specStr = result.substring(braceOpen + 1, braceClose);
    const specs = parseSpecifiers(specStr);

    // If "import type {", all specs are types
    if (isTypeImport) {
      for (const s of specs) s.isType = true;
    }

    const { effectEx, schemaEx, remaining } = group(specs);

    if (effectEx.length === 0 && schemaEx.length === 0) {
      searchFrom = afterClose + 1;
      continue;
    }

    allEffectExSpecs = allEffectExSpecs.concat(effectEx);
    allSchemaExSpecs = allSchemaExSpecs.concat(schemaEx);

    // Build replacement
    let replacement = '';
    if (remaining.length > 0) {
      const typePrefix = isTypeImport ? 'type ' : '';
      replacement = `import ${typePrefix}{ ${remaining.map(fmt).join(', ')} } from '@dxos/effect';`;
    }
    // Namespace imports will be injected later

    replacements.push({ start: blockStart, end: afterClose + 1, replacement });
    searchFrom = afterClose + 1;
  }

  // Apply replacements in reverse order
  for (const rep of [...replacements].reverse()) {
    result = result.substring(0, rep.start) + rep.replacement + result.substring(rep.end);
  }

  // Inject namespace import lines if needed
  if (allEffectExSpecs.length > 0 || allSchemaExSpecs.length > 0) {
    const hasEffectEx = /\bEffectEx\b/.test(result);
    const hasSchemaEx = /\bSchemaEx\b/.test(result);

    const toInject = [];
    if (allEffectExSpecs.length > 0 && !hasEffectEx) {
      toInject.push("import { EffectEx } from '@dxos/effect';");
    }
    if (allSchemaExSpecs.length > 0 && !hasSchemaEx) {
      toInject.push("import { SchemaEx } from '@dxos/effect';");
    }

    if (toInject.length > 0) {
      result = injectImports(result, toInject);
    }
  }

  return { content: result, effectExSpecs: allEffectExSpecs, schemaExSpecs: allSchemaExSpecs };
}

/**
 * Inject import lines into the file, placing them in the @dxos import group.
 */
function injectImports(content, lines) {
  const fileLines = content.split('\n');

  // Find the last @dxos import line index
  let lastDxosIdx = -1;
  for (let i = 0; i < fileLines.length; i++) {
    if (/^import\b.*from\s+'@dxos\//.test(fileLines[i])) {
      lastDxosIdx = i;
    }
  }

  if (lastDxosIdx >= 0) {
    fileLines.splice(lastDxosIdx + 1, 0, ...lines);
  } else {
    // Find last import line
    let lastImportIdx = -1;
    for (let i = 0; i < fileLines.length; i++) {
      if (/^import\b/.test(fileLines[i])) lastImportIdx = i;
    }
    if (lastImportIdx >= 0) {
      fileLines.splice(lastImportIdx + 1, 0, ...lines);
    } else {
      fileLines.unshift(...lines);
    }
  }

  return fileLines.join('\n');
}

/**
 * Replace usages of moved symbols with namespace-qualified names.
 * Uses word-boundary replacement, skipping already-qualified names.
 */
function replaceUsages(content, specs, ns) {
  for (const spec of specs) {
    const local = spec.alias ?? spec.name;
    // Replace word-boundary occurrences that are NOT already qualified (not preceded by ".")
    // and not in a string or comment (best-effort).
    // Pattern: not preceded by "." or alphanumeric/underscore
    const re = new RegExp(`(?<![.\\w])${escapeRegex(local)}(?![\\w])`, 'g');
    content = content.replace(re, `${ns}.${spec.name}`);
  }
  return content;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── Re-export transformation ─────────────────────────────────────────────────

/**
 * Handle `export { X } from '@dxos/effect'` blocks.
 * These are rare; we handle them by substituting with namespace imports + value re-exports.
 */
function transformReExportBlocks(content) {
  // Match: export { ... } from '@dxos/effect';
  let result = content;
  let searchFrom = 0;

  const replacements = [];

  while (true) {
    const exportStart = result.indexOf('export {', searchFrom);
    if (exportStart === -1) break;

    const braceOpen = result.indexOf('{', exportStart);
    const braceClose = result.indexOf('}', braceOpen);
    if (braceClose === -1) {
      searchFrom = braceOpen + 1;
      continue;
    }

    const afterClose = result.indexOf(';', braceClose);
    if (afterClose === -1) {
      searchFrom = braceClose + 1;
      continue;
    }

    const blockText = result.substring(exportStart, afterClose + 1);
    if (!blockText.includes("from '@dxos/effect'")) {
      searchFrom = braceClose + 1;
      continue;
    }

    const specStr = result.substring(braceOpen + 1, braceClose);
    const specs = parseSpecifiers(specStr);
    const { effectEx, schemaEx, remaining } = group(specs);

    if (effectEx.length === 0 && schemaEx.length === 0) {
      searchFrom = afterClose + 1;
      continue;
    }

    const parts = [];
    if (remaining.length > 0) {
      parts.push(`export { ${remaining.map(fmt).join(', ')} } from '@dxos/effect';`);
    }
    // Re-export moved symbols by importing from source files directly
    if (effectEx.length > 0) {
      const names = effectEx.map(fmt).join(', ');
      parts.push(`export { ${names} } from '@dxos/effect/src/errors';`);
    }
    if (schemaEx.length > 0) {
      const astSpecs = schemaEx.filter((s) => isAstSymbol(s.name));
      const jpSpecs = schemaEx.filter((s) => isJsonPathSymbol(s.name));
      const urlSpecs = schemaEx.filter((s) => isUrlSymbol(s.name));
      if (astSpecs.length > 0) parts.push(`export { ${astSpecs.map(fmt).join(', ')} } from '@dxos/effect/src/ast';`);
      if (jpSpecs.length > 0)
        parts.push(`export { ${jpSpecs.map(fmt).join(', ')} } from '@dxos/effect/src/json-path';`);
      if (urlSpecs.length > 0) parts.push(`export { ${urlSpecs.map(fmt).join(', ')} } from '@dxos/effect/src/url';`);
    }

    replacements.push({ start: exportStart, end: afterClose + 1, replacement: parts.join('\n') });
    searchFrom = afterClose + 1;
  }

  for (const rep of [...replacements].reverse()) {
    result = result.substring(0, rep.start) + rep.replacement + result.substring(rep.end);
  }

  return result;
}

const AST_SYMS = new Set([
  'getBaseType',
  'SchemaProperty',
  'getProperties',
  'visit',
  'findNode',
  'findProperty',
  'getAnnotation',
  'findAnnotation',
  'isOption',
  'isLiteralUnion',
  'getLiteralValues',
  'isArrayType',
  'getArrayElementType',
  'isTupleType',
  'isDiscriminatedUnion',
  'getDiscriminatingProps',
  'getDiscriminatedType',
  'isNestedType',
  'mapAst',
  'VisitResult',
  'Path',
  'TestFn',
  'VisitorFn',
]);
const JP_SYMS = new Set([
  'JsonPath',
  'JsonProp',
  'isJsonPath',
  'createJsonPath',
  'fromEffectValidationPath',
  'splitJsonPath',
  'getField',
  'getValue',
  'setValue',
]);
const URL_SYMS = new Set(['UrlParser', 'getParamKeyAnnotation', 'ParamKeyAnnotation']);

function isAstSymbol(n) {
  return AST_SYMS.has(n);
}
function isJsonPathSymbol(n) {
  return JP_SYMS.has(n);
}
function isUrlSymbol(n) {
  return URL_SYMS.has(n);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function findFiles() {
  const out = execSync(
    `grep -rl "from '@dxos/effect'" "${ROOT}" --include="*.ts" --include="*.tsx" | grep -v node_modules`,
    { encoding: 'utf8' },
  ).trim();
  return out
    .split('\n')
    .filter(Boolean)
    .filter((f) => !f.startsWith(SKIP_DIR));
}

function transformFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  // Handle re-exports first (before they get confused with imports)
  content = transformReExportBlocks(content);

  // Handle regular imports
  const { content: c2, effectExSpecs, schemaExSpecs } = transformImportBlocks(content);
  content = c2;

  // Replace usages
  if (effectExSpecs.length > 0) content = replaceUsages(content, effectExSpecs, 'EffectEx');
  if (schemaExSpecs.length > 0) content = replaceUsages(content, schemaExSpecs, 'SchemaEx');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

const files = findFiles();
console.log(`Found ${files.length} candidate files`);

let changed = 0;
const errors = [];

for (const f of files) {
  try {
    if (transformFile(f)) {
      changed++;
      console.log(`  ✓ ${f.replace('/home/user/dxos/', '')}`);
    }
  } catch (err) {
    errors.push({ f, err: err.message });
    console.error(`  ✗ ${f.replace('/home/user/dxos/', '')}: ${err.message}`);
  }
}

console.log(`\nDone: ${changed} files updated, ${errors.length} errors`);
