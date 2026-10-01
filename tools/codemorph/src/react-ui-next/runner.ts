//
// Copyright 2026 DXOS.org
//

import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { CodeFile } from './code-file.ts';
import { type Report, type Residue, type TransformSummary } from './report.ts';
import { type Transform } from './transforms/index.ts';

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'out']);

/** Source files under `paths` (files or directories), minus `exclude` prefixes and build output. */
const collectFiles = (paths: string[], exclude: string[] = []): string[] => {
  const files: string[] = [];
  const excluded = (path: string) => exclude.some((prefix) => path.startsWith(prefix));
  const isSource = (path: string) => /\.tsx?$/.test(path) && !path.endsWith('.d.ts');
  // Symlinks are skipped: they point at files collected elsewhere (or nowhere).
  const visit = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (excluded(path)) {
        continue;
      }
      if (entry.isDirectory() && !SKIP_DIRS.has(entry.name)) {
        visit(path);
      } else if (entry.isFile() && isSource(path)) {
        files.push(path);
      }
    }
  };
  for (const path of paths.filter((path) => !excluded(path))) {
    if (statSync(path).isDirectory()) {
      visit(path);
    } else if (isSource(path)) {
      files.push(path);
    }
  }
  return files.sort();
};

export type TransformResult = {
  text: string;
  counts: Record<string, number>;
  residue: Residue[];
};

/** Runs one transform over one file's text; the text is unchanged when it does not apply or its edits conflict. */
export const runTransform = (
  transform: Transform,
  fileName: string,
  text: string,
  ran: string[] = [],
): TransformResult => {
  if (transform.applies && !transform.applies(text)) {
    return { text, counts: {}, residue: [] };
  }
  const file = new CodeFile(fileName, text, transform.name, ran);
  transform.run(file);
  try {
    return { text: file.finish(), counts: file.counts, residue: file.residue };
  } catch (error) {
    file.report(file.sourceFile, `not converted: ${error instanceof Error ? error.message : String(error)}`);
    return { text, counts: {}, residue: file.residue };
  }
};

export type RunOptions = {
  paths: string[];
  transforms: Transform[];
  exclude?: string[];
  dryRun?: boolean;
  /** Report paths relative to this directory. */
  root?: string;
};

/**
 * Runs the transforms in order over every file, each seeing the previous one's output.
 * Writes the files unless `dryRun`; the report counts each transform separately.
 */
export const run = ({ paths, transforms, exclude = [], dryRun = false, root = process.cwd() }: RunOptions): Report => {
  const summaries: TransformSummary[] = transforms.map((transform) => ({
    transform: transform.name,
    filesScanned: 0,
    filesChanged: 0,
    rules: {},
    residue: [],
  }));
  const changed: string[] = [];
  for (const path of collectFiles(paths, exclude)) {
    const fileName = relative(root, path);
    const original = readFileSync(path, 'utf8');
    let text = original;
    transforms.forEach((transform, index) => {
      const summary = summaries[index];
      const result = runTransform(
        transform,
        fileName,
        text,
        transforms.slice(0, index).map((previous) => previous.name),
      );
      summary.filesScanned++;
      if (result.text !== text) {
        summary.filesChanged++;
      }
      for (const [rule, count] of Object.entries(result.counts)) {
        summary.rules[rule] = (summary.rules[rule] ?? 0) + count;
      }
      summary.residue.push(...result.residue);
      text = result.text;
    });
    if (text !== original) {
      changed.push(fileName);
      if (!dryRun) {
        writeFileSync(path, text);
      }
    }
  }
  return {
    generated: new Date().toISOString(),
    paths: paths.map((path) => relative(root, path)),
    changed,
    transforms: summaries,
  };
};

/** Arguments per tool invocation, so a large run stays under the OS argument limit. */
const CHUNK = 200;

/**
 * Sorts imports (`oxlint --fix`) and formats (`oxfmt`) the given files with the repo's own tools.
 * Lint findings the fix cannot resolve are left for `moon run :lint`; they do not fail the run.
 */
export const formatFiles = (files: string[], cwd = process.cwd()) => {
  for (let index = 0; index < files.length; index += CHUNK) {
    const chunk = files.slice(index, index + CHUNK);
    spawnSync('pnpm', ['exec', 'oxlint', '--fix', '--quiet', ...chunk], { cwd, stdio: 'ignore' });
    const result = spawnSync('pnpm', ['exec', 'oxfmt', '--no-error-on-unmatched-pattern', ...chunk], {
      cwd,
      stdio: 'inherit',
    });
    if (result.status !== 0) {
      throw new Error(`oxfmt failed on ${chunk.length} files`);
    }
  }
};
