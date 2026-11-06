//
// Copyright 2026 DXOS.org
//

import type * as Atom from 'effect/reactivity/Atom';

import type * as Spec from '@dxos/compute/Spec';
import { blockReferences, parseCitation, parseDialectHeader } from '@dxos/deus/schema';
import { Obj } from '@dxos/echo';

import { specSchemas } from './spec-schemas.ts';

/** What nesting reads of one spec: its object id, its front-matter id, and the specs its `Ref<spec>` fields cite. */
export type SpecCitations = { id: string; specId?: string; cites: readonly string[] };

const cache = new WeakMap<Spec.Spec, { content: string; dialects: string; citations: SpecCitations }>();

/** A spec's citations, read again only when its text or its dialects change. */
export const specCitations = (spec: Spec.Spec, content: string, dialects: readonly string[]): SpecCitations => {
  const cached = cache.get(spec);
  if (cached?.content === content && cached.dialects === dialects.join(',')) {
    return cached.citations;
  }
  const specId = parseDialectHeader(content).id;
  const cites = [
    ...new Set(
      blockReferences(content, specSchemas(content, dialects))
        .filter(({ spec }) => spec)
        .map(({ target }) => parseCitation(target).spec),
    ),
  ];
  const citations = { id: spec.id, ...(specId && { specId }), cites };
  cache.set(spec, { content, dialects: dialects.join(','), citations });
  return citations;
};

/** Specs nested by citation: each one's children by object id, and the roots, in the order given. */
export type SpecNesting = { roots: readonly string[]; children: ReadonlyMap<string, readonly string[]> };

/**
 * A spec's children are the specs it cites, by object id or front-matter id; a spec sits under every spec citing it.
 * The roots are the specs nothing cites, then each spec that only a cycle reaches.
 */
export const nestSpecs = (specs: readonly SpecCitations[]): SpecNesting => {
  const byName = new Map<string, string>();
  for (const { id, specId } of specs) {
    byName.set(id, id);
    specId && !byName.has(specId) && byName.set(specId, id);
  }
  const children = new Map(
    specs.map(({ id, cites }) => [
      id,
      [...new Set(cites.flatMap((name) => byName.get(name) ?? []))].filter((child) => child !== id),
    ]),
  );
  const cited = new Set([...children.values()].flat());
  const roots = specs.map(({ id }) => id).filter((id) => !cited.has(id));
  const reached = new Set<string>();
  const reach = (id: string) => {
    if (!reached.has(id)) {
      reached.add(id);
      children.get(id)?.forEach(reach);
    }
  };
  roots.forEach(reach);
  for (const { id } of specs) {
    if (!reached.has(id)) {
      roots.push(id);
      reach(id);
    }
  }
  return { roots, children };
};

/** The nesting of `specs`, following each one's text and dialects. */
export const readNesting = (specs: readonly Spec.Spec[], get: Atom.AtomContext): SpecNesting =>
  nestSpecs(
    specs.map((spec) => {
      const { content: ref, dialects } = get(Obj.atom(spec));
      const text = get(Obj.atomReactive(ref));
      return specCitations(spec, text ? get(Obj.atom(text)).content : '', dialects);
    }),
  );

/** The specs from a root down to `id`, `id` last, by the first path that reaches it. */
export const specLineage = ({ roots, children }: SpecNesting, id: string): string[] | undefined => {
  const visit = (path: string[]): string[] | undefined => {
    const last = path[path.length - 1];
    if (last === id) {
      return path;
    }
    for (const child of children.get(last) ?? []) {
      const found = path.includes(child) ? undefined : visit([...path, child]);
      if (found) {
        return found;
      }
    }
    return undefined;
  };
  for (const root of roots) {
    const found = visit([root]);
    if (found) {
      return found;
    }
  }
  return undefined;
};
