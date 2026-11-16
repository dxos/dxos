//
// Copyright 2026 DXOS.org
//

import * as Spec from '@dxos/compute/Spec';
import { Obj } from '@dxos/echo';

/** A spec in a project's tree of specs, with how deep it lies beneath the project's own. */
export type SpecTreeEntry = { spec: Spec.Spec; depth: number };

/**
 * The spec a spec nests beneath: its nearest ECHO ancestor that is a spec, whatever lies between (another plugin's
 * feature). Stops after a bounded climb.
 */
export const getParentSpec = (spec: Spec.Spec): Spec.Spec | undefined => {
  let current = Obj.getParent(spec);
  for (let depth = 0; current && depth < 64; depth++) {
    if (Spec.instanceOf(current)) {
      return current;
    }
    current = Obj.getParent(current);
  }
  return undefined;
};

/**
 * The project's specs in its order, each followed by the specs of `all` nested beneath it, by name, to any depth. A
 * spec is listed once, so a cycle written by a concurrent move cannot loop.
 */
export const nestSpecs = (top: readonly Spec.Spec[], all: readonly Spec.Spec[]): SpecTreeEntry[] => {
  const children = new Map<string, Spec.Spec[]>();
  for (const spec of all) {
    const parent = getParentSpec(spec);
    if (parent) {
      children.set(parent.id, [...(children.get(parent.id) ?? []), spec]);
    }
  }

  const entries: SpecTreeEntry[] = [];
  const seen = new Set<string>();
  const visit = (spec: Spec.Spec, depth: number) => {
    if (seen.has(spec.id)) {
      return;
    }
    seen.add(spec.id);
    entries.push({ spec, depth });
    [...(children.get(spec.id) ?? [])]
      .sort((left, right) => (left.name ?? '').localeCompare(right.name ?? ''))
      .forEach((child) => visit(child, depth + 1));
  };
  top.forEach((spec) => visit(spec, 0));
  return entries;
};
