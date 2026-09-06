//
// Copyright 2026 DXOS.org
//

import { dirname, join, normalize } from 'node:path';
import { parse as parseYaml } from 'yaml';

import * as Ontology from '../../Ontology.ts';
import { type AnalyzeContext, fileNode } from './common.ts';

/**
 * `package.json` and `moon.yml`: the two files that together assert a `Package` node. Each file
 * contributes from its own graph — identity and dependencies from the manifest, the layer from
 * moon — and RDF unions them.
 */

type Manifest = {
  name?: unknown;
  version?: unknown;
  private?: unknown;
  main?: unknown;
  types?: unknown;
  exports?: unknown;
  dependencies?: unknown;
  devDependencies?: unknown;
  peerDependencies?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// The public entry of an export-map subpath: the source condition when the package publishes one
// (this repo does), else whatever a consumer would see.
const ENTRY_CONDITIONS = ['source', 'types', 'import', 'default', 'node', 'browser'];

const entryTarget = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }
  // A fallback array is a list of candidates in preference order (`["./fallback.js", "./main.js"]`),
  // at the top level or nested under a condition; the first that names a target is the entry.
  if (Array.isArray(value)) {
    return value.map(entryTarget).find((target): target is string => target !== undefined);
  }
  if (isRecord(value)) {
    for (const condition of ENTRY_CONDITIONS) {
      const target = entryTarget(value[condition]);
      if (target) {
        return target;
      }
    }
  }
  return undefined;
};

const workspaceDeps = (value: unknown): string[] =>
  isRecord(value)
    ? Object.entries(value)
        .filter(([, range]) => typeof range === 'string' && range.startsWith('workspace:'))
        .map(([dep]) => Ontology.packageIri(dep).value)
    : [];

export const analyzePackageJson = (context: AnalyzeContext): Ontology.FileDocument => {
  const base = fileNode(context);
  let manifest: Manifest;
  try {
    const parsed: unknown = JSON.parse(context.source);
    manifest = isRecord(parsed) ? parsed : {};
  } catch (error) {
    return { ...base, parseError: [error instanceof Error ? error.message : String(error)] };
  }
  if (typeof manifest.name !== 'string') {
    return base;
  }

  const directory = dirname(context.path);
  const entries = new Set<string>();
  const addEntry = (target: string | undefined) => {
    if (target && (target.startsWith('./') || target.startsWith('../') || !target.startsWith('.'))) {
      const path = normalize(join(directory, target));
      if (!path.startsWith('..')) {
        entries.add(Ontology.fileIri(path).value);
      }
    }
  };
  if (isRecord(manifest.exports)) {
    for (const [subpath, value] of Object.entries(manifest.exports)) {
      if (subpath.startsWith('.')) {
        addEntry(entryTarget(value));
      } else {
        // A bare condition map at the top level is the `.` subpath.
        addEntry(entryTarget(manifest.exports));
        break;
      }
    }
  } else if (typeof manifest.exports === 'string') {
    addEntry(manifest.exports);
  } else if (Array.isArray(manifest.exports)) {
    // A top-level array is a fallback list for the `.` subpath, not an absence of exports; falling
    // through to `types`/`main` would report an entry the package does not actually publish.
    addEntry(entryTarget(manifest.exports));
  } else {
    addEntry(typeof manifest.types === 'string' ? manifest.types : undefined);
    addEntry(typeof manifest.main === 'string' ? manifest.main : undefined);
  }

  return {
    ...base,
    describesPackage: {
      '@id': Ontology.packageIri(manifest.name).value,
      '@type': 'Package',
      'name': manifest.name,
      ...(typeof manifest.version === 'string' ? { version: manifest.version } : {}),
      'private': manifest.private === true,
      'packagePath': directory === '.' ? '' : directory,
      'entry': [...entries],
      'declaresDep': workspaceDeps(manifest.dependencies),
      'declaresDevDep': workspaceDeps(manifest.devDependencies),
      'declaresPeerDep': workspaceDeps(manifest.peerDependencies),
    },
  };
};

export const analyzeMoonYml = (context: AnalyzeContext): Ontology.FileDocument => {
  const base = fileNode(context);
  let parsed: unknown;
  try {
    parsed = parseYaml(context.source);
  } catch (error) {
    return { ...base, parseError: [error instanceof Error ? error.message : String(error)] };
  }
  const layer = isRecord(parsed) && typeof parsed.layer === 'string' ? parsed.layer : undefined;
  // The sibling manifest names the package; `fileNode` already looked it up for `inPackage`.
  const packageName = context.packageOf(context.path);
  if (!layer || !packageName) {
    return base;
  }
  return {
    ...base,
    describesPackage: { '@id': Ontology.packageIri(packageName).value, '@type': 'Package', layer },
  };
};
