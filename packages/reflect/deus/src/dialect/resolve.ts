//
// Copyright 2026 DXOS.org
//

import { frontmatterList } from '../spec-index/parse.ts';
import { declarationsOf } from './declarations.ts';

/** The ids a document's frontmatter lists under `extends`, without their versions, each once. */
export const extendsOf = (text: string): string[] => [
  ...new Set(frontmatterList(text, 'extends').map((id) => id.trim().replace(/@.*$/, ''))),
];

/** The dialects a spec that names none is read with. */
export const BASE_DIALECTS: readonly string[] = ['org.dxos.spec.core', 'org.dxos.spec.changelog'];

/** The dialect of a plugin's spec, which extends every dialect software uses. */
export const SOFTWARE_DIALECT = 'org.dxos.spec.software';

/**
 * The dialects a `.mdl` file is read with, and a spec imported from it holds: the known ones its frontmatter extends,
 * else {@link SOFTWARE_DIALECT}; `extends` may also name other specs, which are not dialects.
 */
export const fileDialects = (text: string, known: ReadonlyMap<string, string>): readonly string[] => {
  const named = extendsOf(text).filter((id) => known.has(id));
  return named.length > 0 ? named : [SOFTWARE_DIALECT];
};

/**
 * A spec's `dialects` with `ids` added (`used`) or removed; {@link BASE_DIALECTS} when that leaves none, since an
 * empty list means the spec's dialects are unset.
 */
export const withDialects = (dialects: readonly string[], ids: readonly string[], used: boolean): readonly string[] => {
  const next = used
    ? [...dialects, ...ids.filter((id) => !dialects.includes(id))]
    : dialects.filter((id) => !ids.includes(id));
  return next.length > 0 ? next : BASE_DIALECTS;
};

/** The dialects a spec is read with: the known ones of its `dialects`, else {@link BASE_DIALECTS}. */
export const resolveDialects = (dialects: readonly string[], known: ReadonlyMap<string, string>): readonly string[] => {
  const named = dialects.filter((id) => known.has(id));
  return named.length > 0 ? named : BASE_DIALECTS;
};

/**
 * The texts of the dialects `ids` name and of every dialect they extend, each once, a dialect after those it extends;
 * an id with no known text is skipped.
 */
export const dialectTexts = (ids: readonly string[], known: ReadonlyMap<string, string>): string[] => {
  const texts: string[] = [];
  const seen = new Set<string>();
  const visit = (id: string) => {
    const text = known.get(id);
    if (seen.has(id) || text === undefined) {
      return;
    }
    seen.add(id);
    extendsOf(text).forEach(visit);
    texts.push(text);
  };
  ids.forEach(visit);
  return texts;
};

/** The block types each set of dialects declares, by the dialects known and their ids. */
const blockTypes = new WeakMap<ReadonlyMap<string, string>, Map<string, readonly string[]>>();

/** The block types the dialects `ids` declare. */
export const dialectBlockTypes = (ids: readonly string[], known: ReadonlyMap<string, string>): readonly string[] => {
  let byIds = blockTypes.get(known);
  if (!byIds) {
    byIds = new Map();
    blockTypes.set(known, byIds);
  }
  const key = ids.join(' ');
  let types = byIds.get(key);
  if (!types) {
    types = [...declarationsOf(dialectTexts(ids, known)).keys()];
    byIds.set(key, types);
  }
  return types;
};
