//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { type CodeGraph } from '#types';

/** IRI namespaces of the code-index ontology (tools/code-index/design/ONTOLOGY.md). */
export const DEUS = 'https://dxos.org/vocab/deus#';
export const FILE = 'https://dxos.org/deus/file/';
export const PACKAGE = 'https://dxos.org/deus/package/';
export const MODULE = 'https://dxos.org/deus/module/';
export const SPEC = 'https://dxos.org/deus/spec/';

export const isIri = (value: string): boolean => /^https?:\/\//.test(value);

/** What a resource is, by namespace; a file IRI with a fragment names a symbol declared in it. */
export const kindOf = (iri: string): CodeGraph.NodeKind => {
  if (iri.startsWith(PACKAGE)) {
    return 'package';
  }
  if (iri.startsWith(FILE)) {
    return iri.includes('#') ? 'symbol' : 'file';
  }
  if (iri.startsWith(MODULE)) {
    return 'module';
  }
  if (iri.startsWith(SPEC)) {
    return 'spec';
  }
  return 'other';
};

/** Percent-decoded text, or the text as is when it is not valid percent-encoding (a stray `%` from a row or prompt). */
const decode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

/** The repo-relative path of a file or symbol IRI. */
export const pathOf = (iri: string): string | undefined =>
  iri.startsWith(FILE) ? decode(iri.slice(FILE.length).split('#')[0]) : undefined;

/** A short name for a box: a package's name, a file's basename, a symbol's name. */
export const labelOf = (iri: string): string => {
  switch (kindOf(iri)) {
    case 'package':
      return decode(iri.slice(PACKAGE.length));
    case 'module':
      return decode(iri.slice(MODULE.length));
    case 'symbol':
      return decode(iri.slice(iri.indexOf('#') + 1));
    case 'file':
      return pathOf(iri)?.split('/').pop() ?? iri;
    default:
      return iri.split(/[#/]/).filter(Boolean).pop() ?? iri;
  }
};

/**
 * The package directory a file or symbol sits in, guessed from its path (everything before `src/`),
 * so boxes group by package without a round trip to the index.
 */
export const groupOf = (iri: string): string | undefined => {
  const path = pathOf(iri);
  if (!path) {
    return undefined;
  }
  const index = path.indexOf('/src/');
  if (index > 0) {
    return path.slice(0, index);
  }
  const slash = path.lastIndexOf('/');
  return slash > 0 ? path.slice(0, slash) : undefined;
};

/** A predicate's local name, from a full IRI or a CURIE: `imports` for `deus:imports`. */
export const localName = (iri: string): string => {
  const tail = iri.split(/[#/]/).filter(Boolean).pop() ?? iri;
  return tail.slice(tail.lastIndexOf(':') + 1);
};

/** Shorthand IRIs the assistant may write (`file:path`, `pkg:@dxos/echo`) expanded to full ones. */
export const expand = (value: string): string => {
  const [prefix, ...rest] = value.split(':');
  const tail = rest.join(':');
  switch (prefix) {
    case 'file':
      return `${FILE}${tail}`;
    case 'pkg':
      return `${PACKAGE}${tail}`;
    case 'module':
      return `${MODULE}${tail}`;
    case 'deus':
      return `${DEUS}${tail}`;
    default:
      return value;
  }
};

/** The shorthand {@link expand} reads back unchanged, so a prompt lists boxes in fewer tokens. */
export const compact = (iri: string): string => {
  for (const [prefix, namespace] of [
    ['file', FILE],
    ['pkg', PACKAGE],
    ['module', MODULE],
    ['deus', DEUS],
  ] as const) {
    if (iri.startsWith(namespace)) {
      return `${prefix}:${iri.slice(namespace.length)}`;
    }
  }
  return iri;
};
