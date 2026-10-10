//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type CpuProfile, functionCosts, unmappedId } from './profile.ts';

const frame = (functionName: string) => ({
  functionName,
  url: 'https://app/assets/main.js',
  lineNumber: 0,
  columnNumber: 0,
});

/** root → render → layout, plus render → render (recursion); one sample every 1000 µs. */
const PROFILE: CpuProfile = {
  nodes: [
    { id: 1, callFrame: { ...frame('(root)'), url: '' }, children: [2] },
    { id: 2, callFrame: frame('render'), children: [3, 4] },
    { id: 3, callFrame: frame('layout') },
    { id: 4, callFrame: frame('render'), children: [5] },
    { id: 5, callFrame: frame('layout') },
  ],
  startTime: 0,
  endTime: 6000,
  samples: [2, 3, 3, 4, 5, 2],
  timeDeltas: [0, 1000, 1000, 1000, 1000, 1000],
};

describe('cpu profile costs', () => {
  test('self time runs from each sample to the next', ({ expect }) => {
    const costs = functionCosts(PROFILE, unmappedId);
    const [render, layout] = [...costs.values()].sort((left, right) => left.label.localeCompare(right.label)).reverse();
    expect(render.selfMs).toBe(3);
    expect(layout.selfMs).toBe(3);
  });

  test('a recursive function counts its total once, at the outermost frame', ({ expect }) => {
    const render = [...functionCosts(PROFILE, unmappedId).values()].find(({ label }) => label.startsWith('render'));
    expect(render?.totalMs).toBe(6);
  });

  test('callers and callees carry the time spent through them, root excluded', ({ expect }) => {
    const costs = [...functionCosts(PROFILE, unmappedId).values()];
    const layout = costs.find(({ label }) => label.startsWith('layout'));
    const render = costs.find(({ label }) => label.startsWith('render'));
    expect([...(layout?.callers.values() ?? [])]).toEqual([3]);
    expect([...(render?.callees.values() ?? [])]).toEqual([3]);
    expect(render?.callers.size).toBe(0);
  });
});
