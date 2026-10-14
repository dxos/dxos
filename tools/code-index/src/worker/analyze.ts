//
// Copyright 2026 DXOS.org
//

import { basename } from 'node:path';

import type * as Ontology from '../Ontology.ts';
import { type AnalyzeContext, fileNode } from './analyzers/common.ts';
import { analyzeMoonYml, analyzePackageJson } from './analyzers/package.ts';
import { analyzeMdl } from './analyzers/spec.ts';
import { analyzeTypeScript, isTypeScriptPath } from './analyzers/typescript.ts';

/**
 * One document per file, the analyzer chosen by filename (`design/ONTOLOGY.md`, "Documents").
 * Anything not matched is a bare `File` node.
 */
export const analyze = (context: AnalyzeContext): Ontology.FileDocument => {
  const name = basename(context.path);
  if (isTypeScriptPath(context.path)) {
    return analyzeTypeScript(context);
  }
  if (name === 'package.json') {
    return analyzePackageJson(context);
  }
  if (name === 'moon.yml') {
    return analyzeMoonYml(context);
  }
  if (context.path.endsWith('.mdl')) {
    return analyzeMdl(context);
  }
  return fileNode(context);
};

export { type AnalyzeContext, type PackageOf, type Resolve, language } from './analyzers/common.ts';
export { createResolver } from './analyzers/resolver.ts';
