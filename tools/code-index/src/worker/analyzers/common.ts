//
// Copyright 2026 DXOS.org
//

import { createHash } from 'node:crypto';
import { extname } from 'node:path';

import * as Ontology from '../../Ontology.ts';

/**
 * What every analyzer receives, and the `File` node every document starts from. Analyzers are pure
 * apart from the two injected lookups: import resolution and the enclosing package.
 */

/** Resolve a specifier from a repo-relative file to an absolute path, or `undefined`. */
export type Resolve = (fromFile: string, specifier: string) => string | undefined;

/** The `package.json` name of the nearest enclosing package of a repo-relative path, or `undefined`. */
export type PackageOf = (path: string) => string | undefined;

export type AnalyzeContext = {
  readonly root: string;
  readonly path: string;
  readonly source: string;
  readonly mtime: number;
  readonly resolve: Resolve;
  readonly packageOf: PackageOf;
};

const LANGUAGES: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.mts': 'typescript',
  '.cts': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.json': 'json',
  '.yml': 'yaml',
  '.yaml': 'yaml',
  '.md': 'markdown',
  '.mdl': 'mdl',
};

export const language = (path: string): string => LANGUAGES[extname(path)] ?? 'other';

/** The bare `File` node: what a file is before any analyzer has looked inside it. */
export const fileNode = (context: AnalyzeContext): Ontology.FileDocument => {
  const packageName = context.packageOf(context.path);
  return {
    '@context': Ontology.CONTEXT,
    '@id': Ontology.fileIri(context.path).value,
    '@type': 'File',
    'path': context.path,
    'language': language(context.path),
    'size': Buffer.byteLength(context.source),
    'mtime': context.mtime,
    'hash': createHash('sha256').update(context.source).digest('hex'),
    ...(packageName ? { inPackage: Ontology.packageIri(packageName).value } : {}),
    'imports': [],
    'importsType': [],
    'importsModule': [],
    'reexports': [],
    'declares': [],
  };
};
