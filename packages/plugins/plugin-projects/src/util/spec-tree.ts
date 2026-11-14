//
// Copyright 2026 DXOS.org
//

import type * as Atom from 'effect/reactivity/Atom';

import type * as Spec from '@dxos/compute/Spec';

import { type SpecNesting, readNesting } from './spec-references.ts';

/** A spec in a project's tree of specs, with how deep it lies beneath the project's own. */
export type SpecTreeEntry = { spec: Spec.Spec; depth: number };

/**
 * `specs` as the picker lists them: each root, followed by the specs nested beneath it by citation, by name, to any
 * depth. A spec is listed once, under the first spec that reaches it, so a cycle cannot loop.
 */
export const specTree = (specs: readonly Spec.Spec[], { roots, children }: SpecNesting): SpecTreeEntry[] => {
  const byId = new Map(specs.map((spec) => [spec.id, spec]));
  const entries: SpecTreeEntry[] = [];
  const seen = new Set<string>();
  const visit = (id: string, depth: number) => {
    const spec = byId.get(id);
    if (!spec || seen.has(id)) {
      return;
    }
    seen.add(id);
    entries.push({ spec, depth });
    (children.get(id) ?? [])
      .flatMap((child) => byId.get(child) ?? [])
      .sort((left, right) => (left.name ?? '').localeCompare(right.name ?? ''))
      .forEach((child) => visit(child.id, depth + 1));
  };
  roots.forEach((id) => visit(id, 0));
  return entries;
};

/** The tree of `specs`, following each one's text. */
export const readSpecTree = (specs: readonly Spec.Spec[], get: Atom.AtomContext): SpecTreeEntry[] =>
  specTree(specs, readNesting(specs, get));
