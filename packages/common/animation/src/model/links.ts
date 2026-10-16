//
// Copyright 2026 DXOS.org
//

import { type Path, matchSelector } from '../path.ts';
import { createRandom } from '../random.ts';
import { type Graph, TemplateError, getNetwork } from './graph.ts';
import { type LinkSpec } from './template.ts';

/** Adds the links a template's rules describe; each pair of networks is linked at most once. */
export const resolveLinks = (graph: Graph, specs: readonly LinkSpec[], seed: number): Graph => {
  const random = createRandom(seed).fork('links');
  const paths = Object.keys(graph.networks);
  const seen = new Set(graph.links.map((link) => `${link.from}|${link.to}`));
  const add = (a: Path, b: Path): void => {
    if (a === b) {
      return;
    }
    const [from, to] = a < b ? [a, b] : [b, a];
    if (!seen.has(`${from}|${to}`)) {
      seen.add(`${from}|${to}`);
      graph.links.push({ from, to });
    }
  };
  const select = (selector: string): Path[] => paths.filter(matchSelector(selector));
  const distance = (a: Path, b: Path): number => {
    const [ax, ay] = getNetwork(graph, a).center;
    const [bx, by] = getNetwork(graph, b).center;
    return Math.hypot(ax - bx, ay - by);
  };
  const isInCloud = (path: Path): boolean => {
    for (let current: Path | undefined = path; current !== undefined; current = getNetwork(graph, current).parent) {
      if (getNetwork(graph, current).kind === 'cloud') {
        return true;
      }
    }
    return false;
  };

  specs.forEach((spec, index) => {
    if (!('rule' in spec)) {
      for (const from of select(spec.from)) {
        for (const to of select(spec.to)) {
          add(from, to);
        }
      }
      return;
    }
    if (spec.rule === 'nearby') {
      const scope = select(spec.scope);
      for (const a of scope) {
        scope
          .filter((b) => b !== a)
          .sort((b, c) => distance(a, b) - distance(a, c) || b.localeCompare(c))
          .slice(0, spec.k)
          .forEach((b) => add(a, b));
      }
      return;
    }
    const clouds = paths.filter((path) => getNetwork(graph, path).kind === 'cloud');
    if (clouds.length === 0) {
      throw new TemplateError('A "cloud" link rule needs a network of kind "cloud"');
    }
    const scope = select(spec.scope).filter((path) => !isInCloud(path));
    const chosen = random
      .fork(index)
      .shuffle(scope)
      .slice(0, Math.round(scope.length * spec.ratio));
    for (const path of chosen) {
      const nearest = [...clouds].sort((a, b) => distance(path, a) - distance(path, b))[0];
      if (nearest !== undefined) {
        add(path, nearest);
      }
    }
  });
  return graph;
};
