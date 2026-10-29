//
// Copyright 2026 DXOS.org
//

import {
  duplicateSpecMessage,
  findSpecRefs,
  missingItemMessage,
  scanFenceLines,
  specDependencies,
  specReferenceFilter,
  unknownSpecMessage,
} from '@dxos/deus/parse';
import { type SourceKey, findSourceKeys, findSymbolLine, isSpecKey } from '@dxos/deus/review';
import { frontmatter } from '@dxos/deus/spec-index';

import { type Workspace, uriOfPath } from './workspace.ts';

/** A block or `req` declaration inside an `mdl` fence: `feat F-1: ...`, `  req F-1.2: ...`, `type Scene`. */
export const DECLARATION = /^\s*([a-z][\w-]*)\s+([A-Za-z][\w.-]*)\s*(?::|$)/;

/** One declared spec item: its kind, id and 0-based line. */
export type Declaration = { kind: string; id: string; line: number };

/** Every block and `req` declaration of a spec, in document order; the first declaration of an id wins. */
export const declarations = (text: string): Declaration[] => {
  const found: Declaration[] = [];
  const seen = new Set<string>();
  let line = -1;
  scanFenceLines(text, ({ line: content, kind, mdl }) => {
    line++;
    if (kind !== 'body' || !mdl) {
      return;
    }
    const [, declared, id] = DECLARATION.exec(content) ?? [];
    if (id && !seen.has(id)) {
      seen.add(id);
      found.push({ kind: declared, id, line });
    }
  });
  return found;
};

/** The 0-based line that declares `item` in a spec text. */
export const itemLine = (text: string, item: string): number | undefined =>
  declarations(text).find(({ id }) => id === item)?.line;

/** Where a reference leads: a file of this checkout at a line, or a URL when the checkout does not have it. */
export type Target =
  | { kind: 'file'; path: string; uri: string; line?: number; key?: SourceKey }
  | { kind: 'url'; url: string; key: SourceKey };

/** Whether a key names a file of the checkout the workspace holds; with no known remote, any key whose file exists. */
const isLocal = (workspace: Workspace, key: SourceKey): boolean =>
  workspace.repo
    ? workspace.repo.owner === key.owner && workspace.repo.repo === key.repo
    : workspace.read(key.path) !== undefined;

/** The GitHub page of a key, at its line when known. */
export const githubUrl = (key: SourceKey, line?: number): string =>
  `https://github.com/${key.owner}/${key.repo}/blob/HEAD/${key.path}${line === undefined ? '' : `#L${line + 1}`}`;

/** The 0-based line a key's fragment names in its file: a spec item, or a code symbol. */
export const fragmentLine = (path: string, text: string, fragment: string | undefined): number | undefined => {
  if (!fragment) {
    return undefined;
  }
  if (path.endsWith('.mdl')) {
    return itemLine(text, fragment);
  }
  const line = findSymbolLine(text, fragment);
  return line === undefined ? undefined : line - 1;
};

/** Resolves a `github:` key to the local file at its fragment, else to its GitHub page. */
export const keyTarget = (workspace: Workspace, key: SourceKey): Target => {
  const text = isLocal(workspace, key) ? workspace.read(key.path) : undefined;
  if (text === undefined) {
    return { kind: 'url', url: githubUrl(key), key };
  }
  return {
    kind: 'file',
    path: key.path,
    uri: uriOfPath(workspace, key.path),
    line: fragmentLine(key.path, text, key.fragment),
    key,
  };
};

/** Resolves a spec id, and optionally an item in it, through the index; an error names what is wrong. */
export const specTarget = (workspace: Workspace, id: string, item?: string): Target | { error: string } => {
  const entry = workspace.index.specs[id];
  if (!entry) {
    return { error: id in workspace.index.duplicates ? duplicateSpecMessage(id) : unknownSpecMessage(id) };
  }
  const text = workspace.read(entry.path);
  const line = item && text !== undefined ? itemLine(text, item) : undefined;
  if (item && line === undefined) {
    return { error: missingItemMessage(id, item) };
  }
  return { kind: 'file', path: entry.path, uri: uriOfPath(workspace, entry.path), line };
};

/** A span of a document that refers to something elsewhere. */
export type Reference = {
  from: number;
  to: number;
  /** What the span says, for hovers: a source key or a spec reference. */
  ref: { kind: 'key'; key: SourceKey } | { kind: 'spec'; id: string; item?: string };
  target: Target | { error: string };
};

/**
 * Every reference in a spec: `github:` keys, and `<spec id>#<item>` references and `uses`/`dependsOn` ids the index
 * knows the namespace of. Sorted by position; a span overlapping an earlier one is dropped. Mirrors
 * `findSourceLinks` in plugin-code's spec editor.
 */
export const findReferences = (workspace: Workspace, text: string): Reference[] => {
  const references: Reference[] = findSourceKeys(text).map(({ from, to, key }) => ({
    from,
    to,
    ref: { kind: 'key', key },
    target: keyTarget(workspace, key),
  }));
  const isReference = specReferenceFilter(workspace.index);
  const selfId = frontmatter(text).id;
  for (const { id, item, from, to } of findSpecRefs(text)) {
    if (!isReference(id)) {
      continue;
    }
    const target = specTarget(workspace, id, item);
    // The lint does not check references into the spec itself, which may not be indexed yet.
    if (id !== selfId || !('error' in target)) {
      references.push({ from, to, ref: { kind: 'spec', id, item }, target });
    }
  }
  for (const { id, from, to } of specDependencies(text)) {
    references.push({ from, to, ref: { kind: 'spec', id }, target: specTarget(workspace, id) });
  }
  let end = -1;
  return references
    .sort((left, right) => left.from - right.from)
    .filter((reference) => {
      if (reference.from < end) {
        return false;
      }
      end = reference.to;
      return true;
    });
};

/** The spec a review judges: its frontmatter `spec:` key when local, else the `.mdl` beside it. */
export const reviewedSpecPath = (workspace: Workspace, reviewPath: string, reviewText: string): string => {
  const spec = frontmatter(reviewText).spec;
  const key = spec ? findSourceKeys(spec)[0]?.key : undefined;
  return key && isSpecKey(key) && isLocal(workspace, key) ? key.path : reviewPath.replace(/\.review\.mdl$/, '.mdl');
};

/** The review written beside a spec, `SPEC.mdl` -> `SPEC.review.mdl`; undefined for a review itself. */
export const reviewPathOf = (specPath: string): string | undefined =>
  specPath.endsWith('.review.mdl') || !specPath.endsWith('.mdl')
    ? undefined
    : specPath.replace(/\.mdl$/, '.review.mdl');
