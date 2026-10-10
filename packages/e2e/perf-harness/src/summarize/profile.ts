//
// Copyright 2026 DXOS.org
//

import { type SourceFrame } from './sourcemap.ts';

export type CallFrame = { functionName: string; url: string; lineNumber: number; columnNumber: number };

export type CpuProfile = {
  nodes: Array<{ id: number; callFrame: CallFrame; children?: number[] }>;
  startTime: number;
  endTime: number;
  samples?: number[];
  timeDeltas?: number[];
};

export const isCpuProfile = (value: unknown): value is CpuProfile =>
  typeof value === 'object' &&
  value !== null &&
  Array.isArray(Reflect.get(value, 'nodes')) &&
  typeof Reflect.get(value, 'startTime') === 'number' &&
  typeof Reflect.get(value, 'endTime') === 'number';

/** A function as the summary names it: source-mapped where a map exists, the built chunk's position otherwise. */
export type FunctionId = { key: string; label: string; package: string; source?: string };

export type Resolve = (frame: CallFrame) => FunctionId;

/** Time in one function, and the time it spent in or was called from each neighbour, all in ms. */
export type FunctionCost = FunctionId & {
  selfMs: number;
  totalMs: number;
  callers: Map<string, number>;
  callees: Map<string, number>;
};

/** Not functions: the root of every tree, and time the thread spent waiting. */
const HIDDEN = new Set(['(root)', '(idle)']);

const chunkName = (url: string) => url.split('/').pop()?.split('?')[0] ?? url;

export const unmappedId: Resolve = ({ functionName, url, lineNumber, columnNumber }) => ({
  key: `${functionName}@${url}:${lineNumber}:${columnNumber}`,
  label: url ? `${functionName || '(anonymous)'} ${chunkName(url)}:${lineNumber + 1}` : functionName || '(native)',
  package: '',
});

/** Names a frame by its source position; `lineNumber` in a CPU profile is 0-based. */
export const sourceMappedId =
  (resolve: (script: string, line: number, column: number) => SourceFrame | undefined): Resolve =>
  (frame) => {
    const source = frame.url ? resolve(frame.url, frame.lineNumber + 1, frame.columnNumber) : undefined;
    if (!source) {
      return unmappedId(frame);
    }
    const name = source.name ?? (frame.functionName || '(anonymous)');
    return {
      key: `${source.source}:${source.line}:${name}`,
      label: `${name} ${source.source.split('/').slice(-2).join('/')}:${source.line}`,
      package: source.package,
      source: source.source,
    };
  };

/**
 * Self and total time per function over one profile. A sample's duration runs to the next sample;
 * total time counts a recursive function once, at its outermost frame.
 */
export const functionCosts = (profile: CpuProfile, resolve: Resolve): Map<string, FunctionCost> => {
  const nodes = new Map(profile.nodes.map((node) => [node.id, node]));
  const parents = new Map<number, number>();
  for (const node of profile.nodes) {
    for (const child of node.children ?? []) {
      parents.set(child, node.id);
    }
  }

  const selfUs = new Map<number, number>();
  const samples = profile.samples ?? [];
  const deltas = profile.timeDeltas ?? [];
  const times: number[] = [];
  let clock = profile.startTime;
  for (let index = 0; index < samples.length; ++index) {
    clock += deltas[index] ?? 0;
    times.push(clock);
  }
  for (let index = 0; index < samples.length; ++index) {
    const end = index + 1 < samples.length ? times[index + 1] : profile.endTime;
    selfUs.set(samples[index], (selfUs.get(samples[index]) ?? 0) + Math.max(0, end - times[index]));
  }

  const totalUs = new Map<number, number>();
  const total = (id: number): number => {
    const known = totalUs.get(id);
    if (known !== undefined) {
      return known;
    }
    const value = (selfUs.get(id) ?? 0) + (nodes.get(id)?.children ?? []).reduce((sum, child) => sum + total(child), 0);
    totalUs.set(id, value);
    return value;
  };

  const ids = new Map<number, FunctionId>();
  const idOf = (nodeId: number): FunctionId | undefined => {
    const node = nodes.get(nodeId);
    if (!node || HIDDEN.has(node.callFrame.functionName)) {
      return undefined;
    }
    let id = ids.get(nodeId);
    if (!id) {
      id = resolve(node.callFrame);
      ids.set(nodeId, id);
    }
    return id;
  };

  const costs = new Map<string, FunctionCost>();
  for (const node of profile.nodes) {
    const id = idOf(node.id);
    if (!id) {
      continue;
    }
    const cost = costs.get(id.key) ?? { ...id, selfMs: 0, totalMs: 0, callers: new Map(), callees: new Map() };
    costs.set(id.key, cost);
    const nodeTotalMs = total(node.id) / 1000;
    cost.selfMs += (selfUs.get(node.id) ?? 0) / 1000;

    let recursive = false;
    for (let ancestor = parents.get(node.id); ancestor !== undefined; ancestor = parents.get(ancestor)) {
      if (idOf(ancestor)?.key === id.key) {
        recursive = true;
        break;
      }
    }
    if (!recursive) {
      cost.totalMs += nodeTotalMs;
    }

    const parent = parents.get(node.id);
    const caller = parent === undefined ? undefined : idOf(parent);
    if (caller && caller.key !== id.key) {
      cost.callers.set(caller.key, (cost.callers.get(caller.key) ?? 0) + nodeTotalMs);
    }
    for (const child of node.children ?? []) {
      const callee = idOf(child);
      if (callee && callee.key !== id.key) {
        cost.callees.set(callee.key, (cost.callees.get(callee.key) ?? 0) + total(child) / 1000);
      }
    }
  }
  return costs;
};
