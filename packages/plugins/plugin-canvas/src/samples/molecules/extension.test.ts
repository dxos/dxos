//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type DataFlowSpec, layoutDataFlow, partitionHub } from './layout.ts';
import { planArrivals, planMove, planSplit } from './morph.ts';
import { DataFlowSimulation } from './simulation.ts';

const SOURCES = [
  { id: 'mail', label: 'Mail', hue: 'blue' },
  { id: 'docs', label: 'Docs', hue: 'orange' },
  { id: 'finance', label: 'Finance', hue: 'green' },
  { id: 'ops', label: 'Ops', hue: 'fuchsia' },
];

const APPS: DataFlowSpec = {
  sources: SOURCES,
  hub: { label: '', partitions: 1 },
  sinks: SOURCES.map(({ label }) => ({ label, app: 'document' as const })),
};

const more = (count: number, prefix: string) =>
  Array.from({ length: count }, (_, index) => ({ id: `${prefix}${index}`, label: `${prefix}${index}`, hue: 'teal' }));

const EXTENDED: DataFlowSpec = {
  ...APPS,
  hub: { label: '', partitions: 3 },
  extend: {
    left: { buckets: 9, sources: more(10, 'l'), sinks: more(10, 'a') },
    right: { buckets: 9, sources: more(10, 'r'), sinks: more(10, 'b') },
  },
};

const run = (simulation: DataFlowSimulation, seconds: number) => {
  for (let elapsed = 0; elapsed < seconds; elapsed += 1 / 30) {
    simulation.step(1 / 30);
  }
};

describe('extension', () => {
  test('puts an app or agent under every source', ({ expect }) => {
    const layout = layoutDataFlow(EXTENDED);
    const centre = ({ frame }: { frame: { x: number; width: number } }) => frame.x + frame.width / 2;
    for (const source of layout.sources) {
      expect(layout.sinks.some((sink) => Math.abs(centre(sink) - centre(source)) < 1)).toBe(true);
    }
  });

  // Steps the simulation through ~50 s of frames: 6.6 s on a laptop, up to 45 s in a 4 vCPU CI shard.
  test('keeps the molecules of the buckets it started with', { timeout: 90_000 }, ({ expect }) => {
    const base = layoutDataFlow(APPS);
    const simulation = new DataFlowSimulation(base, { seed: 3, warmup: 40 });
    const split = partitionHub(base.hub, 3);
    let frame = simulation.frame();
    simulation.split(split, planSplit(base.hub, split, frame.bodies, frame.bonds, base.hubGrid.spacing));
    run(simulation, 10);

    const next = layoutDataFlow(EXTENDED);
    const held = (index: number) => {
      const bucket = (next.hub.buckets ?? [])[index];
      return simulation
        .frame()
        .bodies.filter(
          (body) =>
            body.zone === 'hub' &&
            body.phase === 'docked' &&
            body.position.x >= bucket.x &&
            body.position.x <= bucket.x + bucket.width,
        ).length;
    };
    expect([0, 1, 2].map(held).every((count) => count > 0)).toBe(true);
    frame = simulation.frame();
    const arrivals = planArrivals({ ...base, hub: split }, next);
    simulation.relayout(
      next,
      planMove(split, next.hub, frame.bodies, frame.bonds, next.hubGrid.spacing),
      new Map([...arrivals.windows].map(([id, { start }]) => [id, start * 8])),
    );
    // The seeded buckets must not crowd the old ones out of the hub's capacity.
    run(simulation, 10);
    expect([0, 1, 2].map(held).every((count) => count > 0)).toBe(true);
  });
});
