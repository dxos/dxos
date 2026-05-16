//
// Copyright 2026 DXOS.org
//

import { glob } from 'glob';
import { readFile } from 'node:fs/promises';
import { relative } from 'node:path';

import { isWellFormedId } from '@dxos/util';

import type { Idiom, IdiomHost } from './types';

export type ScanIdiomsOptions = {
  /** Repo root to scan. */
  rootPath: string;
  /** Globs relative to rootPath. Defaults to packages/**\/src/**\/*.{ts,tsx}. */
  patterns?: string[];
  /** Globs to exclude. Defaults to node_modules, dist, __fixtures__. */
  ignore?: string[];
};

const DEFAULT_PATTERNS = ['packages/**/src/**/*.ts', 'packages/**/src/**/*.tsx'];
const DEFAULT_IGNORE = ['**/node_modules/**', '**/dist/**', '**/__fixtures__/**', '**/gen/**'];

/**
 * Locate every `@idiom <slug>` JSDoc tag under `rootPath` and return a flat list.
 *
 * POC implementation: regex over source files. Does not resolve `{@link}` refs
 * against a symbol graph — that comes when this moves onto the ts-morph indexer.
 */
export const scanIdioms = async (options: ScanIdiomsOptions): Promise<Idiom[]> => {
  const { rootPath, patterns = DEFAULT_PATTERNS, ignore = DEFAULT_IGNORE } = options;

  const files = await glob(patterns, { cwd: rootPath, ignore, absolute: true });

  const idioms: Idiom[] = [];
  for (const filePath of files) {
    const content = await readFile(filePath, 'utf8');
    if (!content.includes('@idiom')) {
      continue;
    }
    idioms.push(...parseFile(content, filePath, rootPath));
  }

  idioms.sort((left, right) => left.slug.localeCompare(right.slug));
  return idioms;
};

const JSDOC_BLOCK_RE = /\/\*\*([\s\S]*?)\*\//g;
// Slug must be an NSID — validated via @dxos/util.isWellFormedId.
const IDIOM_TAG_RE = /@idiom\s+([a-zA-Z][a-zA-Z0-9.\-]+)\s*\n([\s\S]*)/;

const parseFile = (content: string, absPath: string, rootPath: string): Idiom[] => {
  const out: Idiom[] = [];
  for (const match of content.matchAll(JSDOC_BLOCK_RE)) {
    const block = match[1];
    if (!block.includes('@idiom')) {
      continue;
    }

    const slugMatch = block.match(/@idiom\s+([a-zA-Z][a-zA-Z0-9.\-]*[a-zA-Z0-9])/);
    if (!slugMatch) {
      continue;
    }
    const slug = slugMatch[1];
    if (!isWellFormedId(slug)) {
      throw new Error(`Invalid idiom slug (expected AT Protocol NSID): ${JSON.stringify(slug)}`);
    }

    const startIdx = match.index ?? 0;
    const line = content.slice(0, startIdx).split('\n').length;

    const body = stripStars(block);
    const summary = extractSummary(body);
    const fields = extractIdiomBody(body);

    if (!fields.applies) {
      throw new Error(`Idiom ${JSON.stringify(slug)} is missing the required \`applies:\` field.`);
    }

    const host = detectHost(content, startIdx + match[0].length, absPath, rootPath, line);

    out.push({
      slug,
      summary,
      applies: fields.applies,
      insteadOf: fields['instead-of'],
      uses: parseList(fields.uses),
      related: parseList(fields.related),
      host,
    });
  }
  return out;
};

const stripStars = (block: string): string =>
  block
    .split('\n')
    .map((line) => line.replace(/^\s*\*\s?/, ''))
    .join('\n')
    .trim();

const extractSummary = (body: string): string | undefined => {
  const beforeTag = body.split(/@idiom\s/)[0]?.trim();
  if (!beforeTag) {
    return undefined;
  }
  // First paragraph only.
  const firstPara = beforeTag.split(/\n\s*\n/)[0];
  return firstPara.trim() || undefined;
};

const extractIdiomBody = (body: string): Record<string, string> => {
  const fields: Record<string, string> = {};
  const tagMatch = body.match(IDIOM_TAG_RE);
  if (!tagMatch) {
    return fields;
  }
  const lines = tagMatch[2].split('\n');
  let current: string | undefined;
  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, '');
    if (!line.trim()) {
      continue;
    }
    if (line.startsWith('@')) {
      break;
    }
    const kv = line.match(/^\s*([a-z][a-z-]*):\s*(.*)$/);
    if (kv) {
      current = kv[1];
      fields[current] = kv[2];
    } else if (current) {
      fields[current] += ' ' + line.trim();
    }
  }
  return fields;
};

const parseList = (value: string | undefined): string[] => {
  if (!value) {
    return [];
  }
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const SYMBOL_RE = /^\s*export\s+(?:const|let|var|function|class|async\s+function)\s+([A-Za-z_$][\w$]*)/m;
const TEST_RE = /^\s*test\s*\(\s*['"`]([^'"`]+)/m;

const detectHost = (
  content: string,
  jsdocEndIdx: number,
  absPath: string,
  rootPath: string,
  jsdocStartLine: number,
): IdiomHost => {
  const tail = content.slice(jsdocEndIdx, jsdocEndIdx + 512);
  const exportMatch = tail.match(SYMBOL_RE);
  const testMatch = tail.match(TEST_RE);
  const file = relative(rootPath, absPath);

  const kind: IdiomHost['kind'] = file.endsWith('.stories.tsx') ? 'story' : file.includes('.test.') ? 'test' : 'symbol';

  const symbol = exportMatch?.[1] ?? testMatch?.[1];
  return { file, line: jsdocStartLine, symbol, kind };
};
