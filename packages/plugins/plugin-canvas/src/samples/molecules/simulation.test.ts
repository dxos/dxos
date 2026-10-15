//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { invariant } from '@dxos/invariant';

import { type DataFlowSpec, createDataFlowScene, layoutDataFlow, partitionHub } from './layout.ts';
import {
  createRandom,
  generateMolecule,
  hexDistance,
  hexKey,
  hexNeighbours,
  hexSubtract,
  hexToPoint,
  pointToHex,
} from './molecule.ts';
import { planSplit } from './morph.ts';
import { DataFlowSimulation } from './simulation.ts';

const SPEC: DataFlowSpec = {
  sources: [
    { id: 'a', label: 'A', hue: 'green' },
    { id: 'b', label: 'B', hue: 'violet' },
    { id: 'c', label: 'C', hue: 'blue' },
    { id: 'd', label: 'D', hue: 'orange' },
  ],
  hub: { label: 'Hub' },
  sinks: [{ label: 'Sink' }],
};

const run = (simulation: DataFlowSimulation, seconds: number) => {
  for (let elapsed = 0; elapsed < seconds; elapsed += 1 / 30) {
    simulation.step(1 / 30);
  }
};

describe('molecule', () => {
  test('is a tree of lattice neighbours', ({ expect }) => {
    const random = createRandom(7);
    for (let index = 0; index < 100; index++) {
      const molecule = generateMolecule(random);
      expect(molecule.atoms.length).toBeGreaterThanOrEqual(1);
      expect(molecule.atoms.length).toBeLessThanOrEqual(4);
      expect(molecule.bonds).toHaveLength(molecule.atoms.length - 1);
      expect(new Set(molecule.atoms.map(hexKey)).size).toBe(molecule.atoms.length);
      for (const [from, to] of molecule.bonds) {
        expect(hexDistance(hexSubtract(molecule.atoms[from], molecule.atoms[to]))).toBe(1);
      }
    }
  });
});

describe('layout', () => {
  test('places the hub below the sources and the sink below the hub', ({ expect }) => {
    const layout = layoutDataFlow(SPEC);
    expect(layout.sources).toHaveLength(4);
    expect(layout.channels).toHaveLength(5);
    const sourceBottom = layout.sources[0].frame.y + layout.sources[0].frame.height;
    expect(layout.hub.frame.y).toBeGreaterThan(sourceBottom);
    const [sink] = layout.sinks;
    const [sinkGrid] = layout.sinkGrids;
    invariant(sink && sinkGrid);
    expect(sink.frame.y).toBeGreaterThan(layout.hub.frame.y + layout.hub.frame.height);
    expect(sinkGrid.bounds.width).toBeLessThan(layout.hubGrid.bounds.width);
    const scene = createDataFlowScene(layout);
    expect(Object.keys(scene.nodes)).toHaveLength(6);
  });
});

describe('simulation', () => {
  test('settles molecules from every source onto the hub lattice and syncs a subset to the sink', ({ expect }) => {
    const layout = layoutDataFlow(SPEC);
    const simulation = new DataFlowSimulation(layout, { seed: 3 });
    // Copies come and go with their originals, so count every copy that ever lands in the sink.
    const synced = new Set<string>();
    for (let elapsed = 0; elapsed < 60; elapsed += 1 / 30) {
      simulation.step(1 / 30);
      for (const body of simulation.bodies) {
        if (body.zone === 'sink' && body.phase === 'docked' && !body.authored) {
          synced.add(body.id);
        }
      }
    }
    expect(synced.size).toBeGreaterThan(0);

    const hub = simulation.bodies.filter((body) => body.zone === 'hub' && body.phase === 'docked');
    const sink = simulation.bodies.filter((body) => body.zone === 'sink' && body.phase === 'docked');
    expect(new Set(hub.map((body) => body.hue)).size).toBe(4);

    const [sinkGrid] = layout.sinkGrids;
    invariant(sinkGrid);
    for (const [bodies, grid] of [
      [hub, layout.hubGrid],
      [sink, sinkGrid],
    ] as const) {
      // Every docked atom sits exactly on its own lattice site, inside the well.
      const sites = bodies.flatMap((body) => body.sites ?? []);
      expect(new Set(sites.map(hexKey)).size).toBe(sites.length);
      for (const body of bodies) {
        body.sites?.forEach((site, index) => {
          const point = hexToPoint(site, grid.spacing);
          expect(body.position.x + body.offsets[index].x).toBeCloseTo(grid.origin.x + point.x);
          expect(body.position.y + body.offsets[index].y).toBeCloseTo(grid.origin.y + point.y);
          expect(grid.origin.x + point.x).toBeGreaterThanOrEqual(grid.bounds.x);
          expect(grid.origin.x + point.x).toBeLessThanOrEqual(grid.bounds.x + grid.bounds.width);
        });
      }
    }

    // A sink copy mirrors a hub molecule still present; one whose original decayed while it travelled keeps no origin.
    const ids = new Set(simulation.bodies.filter((body) => body.zone === 'hub').map((body) => body.id));
    const copies = sink.filter((body) => !body.authored);
    expect(copies.every((body) => body.origin === undefined || ids.has(body.origin))).toBe(true);
    // Molecules attach to the lattice's edge, so the hub is bonded together.
    expect(simulation.latticeBonds('hub').length).toBeGreaterThan(hub.length / 2);
  });

  test('carries agent-written molecules up to the hub and back to their sources', ({ expect }) => {
    const simulation = new DataFlowSimulation(layoutDataFlow(SPEC), { seed: 5, writeback: 1 });
    const seen = new Set<string>();
    for (let elapsed = 0; elapsed < 60; elapsed += 1 / 30) {
      simulation.step(1 / 30);
      for (const body of simulation.bodies) {
        if (body.authored) {
          seen.add(`${body.zone}:${body.id.endsWith('-back') ? 'back' : body.phase}`);
        }
      }
    }
    expect(seen).toContain('sink:docked');
    expect(seen).toContain('hub:docked');
    expect(seen).toContain('source:back');
    // A write-back lands on its source's grid, like a molecule formed there.
    const layout = layoutDataFlow(SPEC);
    const landed = simulation.bodies.filter((body) => body.id.endsWith('-back') && body.phase === 'leaving');
    for (const body of landed) {
      const { grid } = layout.sources[body.source];
      const point = { x: body.position.x - grid.origin.x, y: body.position.y - grid.origin.y };
      const site = hexToPoint(pointToHex(point, grid.spacing), grid.spacing);
      expect(point.x).toBeCloseTo(site.x);
      expect(point.y).toBeCloseTo(site.y);
    }
    // Up traffic stays a trickle beside what flows down.
    const authored = simulation.bodies.filter((body) => body.authored && body.zone === 'hub').length;
    const down = simulation.bodies.filter((body) => !body.authored && body.zone === 'hub').length;
    expect(authored).toBeLessThan(down / 4);
  });

  test('decays cached molecules once their lifetime passes, slowly until the hub is half full', ({ expect }) => {
    const layout = layoutDataFlow(SPEC);
    const lasting = new DataFlowSimulation(layout, { seed: 9, hubLifetime: 1000 });
    const decaying = new DataFlowSimulation(layout, { seed: 9, hubLifetime: 5 });
    run(lasting, 40);
    run(decaying, 40);
    const held = (simulation: DataFlowSimulation) =>
      simulation.bodies.filter((body) => body.zone === 'hub' && body.phase === 'docked').length;
    expect(held(decaying)).toBeLessThan(held(lasting));
    // Well short of half full, the hub wears away only slowly, so most of what landed is still there.
    expect(held(decaying)).toBeGreaterThan(held(lasting) / 2);
  });

  test('leaves no docked molecule without a bond once the lattice has more than one', ({ expect }) => {
    const simulation = new DataFlowSimulation(layoutDataFlow(SPEC), { seed: 4, sinkLifetime: 5 });
    run(simulation, 40);
    const sink = simulation.bodies.filter((body) => body.zone === 'sink' && body.phase === 'docked');
    expect(sink.length).toBeGreaterThan(1);
    // The sink grows from one seed, which alone may stand without a bond (a bond to a molecule still on its way counts).
    expect(sink.filter((body) => !simulation.bonded(body.id)).length).toBeLessThanOrEqual(1);
  });

  test('runs every molecule down the middle of its channel', ({ expect }) => {
    const layout = layoutDataFlow(SPEC);
    const simulation = new DataFlowSimulation(layout, { seed: 6 });
    let checked = 0;
    for (let elapsed = 0; elapsed < 30; elapsed += 1 / 30) {
      simulation.step(1 / 30);
      for (const body of simulation.bodies.filter((body) => body.phase === 'travelling')) {
        const channel = layout.channels.find(
          ({ from, to }) =>
            body.cursor.y > from.y + 1 && body.cursor.y < to.y - 1 && Math.abs(body.cursor.x - from.x) < 40,
        );
        if (channel) {
          checked++;
          expect(body.cursor.x).toBeCloseTo(channel.from.x);
          const xs = body.offsets.map((offset) => body.position.x + offset.x);
          expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(channel.from.x);
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  test('spreads the hub lattice in a band across the well', ({ expect }) => {
    const layout = layoutDataFlow(SPEC);
    const simulation = new DataFlowSimulation(layout, { seed: 8 });
    run(simulation, 40);
    const xs = simulation.bodies
      .filter((body) => body.zone === 'hub' && body.phase === 'docked')
      .map((body) => body.position.x);
    const { well } = layout.hub;
    // Two full rows stay empty above and below the band.
    const rowHeight = (layout.hubGrid.spacing * Math.sqrt(3)) / 2;
    const ys = simulation.bodies
      .filter((body) => body.zone === 'hub' && body.phase === 'docked')
      .flatMap((body) => body.offsets.map((offset) => body.position.y + offset.y));
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(layout.hubGrid.bounds.y + 2 * rowHeight - 0.01);
    expect(Math.max(...ys)).toBeLessThanOrEqual(
      layout.hubGrid.bounds.y + layout.hubGrid.bounds.height - 2 * rowHeight + 0.01,
    );
    // Molecules sit under every channel, from the left quarter of the well to the right one.
    expect(Math.min(...xs)).toBeLessThan(well.x + well.width / 4);
    expect(Math.max(...xs)).toBeGreaterThan(well.x + (3 * well.width) / 4);
  });

  test('sends molecules from each channel to random sections of the band', ({ expect }) => {
    const layout = layoutDataFlow(SPEC);
    const simulation = new DataFlowSimulation(layout, { seed: 12 });
    run(simulation, 40);
    const middle = layout.hub.well.x + layout.hub.well.width / 2;
    const leftmost = simulation.bodies.filter(
      (body) => body.zone === 'hub' && body.phase === 'docked' && body.source === 0 && !body.authored,
    );
    // The leftmost source's molecules reach the right half too, not just the section beneath their channel.
    expect(leftmost.some((body) => body.position.x > middle)).toBe(true);
  });

  test('moves molecules only across or along, never diagonally', ({ expect }) => {
    const simulation = new DataFlowSimulation(layoutDataFlow(SPEC), { seed: 13 });
    let legs = 0;
    for (let elapsed = 0; elapsed < 30; elapsed += 1 / 30) {
      simulation.step(1 / 30);
      for (const body of simulation.bodies.filter((body) => body.phase === 'travelling')) {
        const path = [body.cursor, ...body.route];
        for (let index = 1; index < path.length; index++) {
          legs++;
          const dx = Math.abs(path[index].x - path[index - 1].x);
          const dy = Math.abs(path[index].y - path[index - 1].y);
          expect(Math.min(dx, dy)).toBeLessThan(0.01);
        }
      }
    }
    expect(legs).toBeGreaterThan(0);
  });

  test("keeps a molecule's shape until its final drop, and never turns it", ({ expect }) => {
    const simulation = new DataFlowSimulation(layoutDataFlow(SPEC), { seed: 14 });
    let checked = 0;
    for (let elapsed = 0; elapsed < 30; elapsed += 1 / 30) {
      simulation.step(1 / 30);
      for (const body of simulation.bodies.filter(
        (body) => body.phase === 'travelling' && body.travelled < body.settle,
      )) {
        checked++;
        expect(body.offsets).toEqual(body.from);
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  test("forms molecules on their source's hex grid", ({ expect }) => {
    const layout = layoutDataFlow(SPEC);
    const simulation = new DataFlowSimulation(layout, { seed: 15 });
    run(simulation, 5);
    const forming = simulation.bodies.filter((body) => body.phase === 'forming');
    expect(forming.length).toBeGreaterThan(0);
    for (const body of forming) {
      const { grid } = layout.sources[body.source];
      for (const offset of body.offsets) {
        const point = { x: body.position.x + offset.x - grid.origin.x, y: body.position.y + offset.y - grid.origin.y };
        const site = hexToPoint(pointToHex(point, grid.spacing), grid.spacing);
        expect(point.x).toBeCloseTo(site.x);
        expect(point.y).toBeCloseTo(site.y);
      }
    }
  });

  test('grows a round cluster in the radial variant from all nine sources', ({ expect }) => {
    const hues = ['green', 'teal', 'sky', 'blue', 'violet', 'red', 'orange', 'amber', 'neutral'];
    const layout = layoutDataFlow({
      variant: 'radial',
      sources: hues.map((hue) => ({ id: hue, label: hue, hue })),
      hub: { label: 'Hub' },
    });
    expect(layout.sinks).toHaveLength(0);
    expect(layout.channels).toHaveLength(9);
    const simulation = new DataFlowSimulation(layout, { seed: 16 });
    run(simulation, 40);
    const { origin, radius = 0 } = layout.hubGrid;
    const hub = simulation.bodies.filter((body) => body.zone === 'hub' && body.phase === 'docked');
    expect(new Set(hub.map((body) => body.hue)).size).toBeGreaterThanOrEqual(7);
    for (const body of hub) {
      for (const offset of body.offsets) {
        expect(
          Math.hypot(body.position.x + offset.x - origin.x, body.position.y + offset.y - origin.y),
        ).toBeLessThanOrEqual(radius + 0.01);
      }
    }
    expect(simulation.bodies.some((body) => body.zone === 'sink')).toBe(false);
  });

  test('never fades a moving molecule, and keeps moving molecules apart', ({ expect }) => {
    const simulation = new DataFlowSimulation(layoutDataFlow(SPEC), { seed: 17 });
    const phases = new Map<string, string>();
    let closest = Infinity;
    for (let elapsed = 0; elapsed < 60; elapsed += 1 / 30) {
      simulation.step(1 / 30);
      for (const body of simulation.bodies) {
        // A write-back is absorbed as it arrives in its source; nothing else may fade while it moves.
        if (body.phase === 'leaving' && !body.id.endsWith('-back')) {
          expect(phases.get(body.id)).not.toBe('travelling');
        }
        phases.set(body.id, body.phase);
      }
      const moving = simulation.bodies.filter((body) => body.phase === 'travelling' && body.cleared);
      for (let i = 0; i < moving.length; i++) {
        for (let j = i + 1; j < moving.length; j++) {
          closest = Math.min(
            closest,
            Math.hypot(moving[i].cursor.x - moving[j].cursor.x, moving[i].cursor.y - moving[j].cursor.y),
          );
        }
      }
    }
    expect(closest).toBeGreaterThan(30);
  });

  test('bonds only lattice neighbours and keeps source molecules apart on their grid', ({ expect }) => {
    const layout = layoutDataFlow(SPEC);
    const simulation = new DataFlowSimulation(layout, { seed: 18 });
    for (let elapsed = 0; elapsed < 40; elapsed += 1 / 30) {
      simulation.step(1 / 30);
      for (const body of simulation.bodies.filter((body) => body.phase !== 'travelling')) {
        for (const [a, b] of body.molecule.bonds) {
          const from = body.offsets[a];
          const to = body.offsets[b];
          expect(Math.hypot(to.x - from.x, to.y - from.y)).toBeCloseTo(layout.hubGrid.spacing);
        }
      }
      for (const [index, source] of layout.sources.entries()) {
        const { grid } = source;
        const owners = new Map<string, string>();
        for (const body of simulation.bodies.filter((body) => body.phase === 'forming' && body.source === index)) {
          for (const offset of body.offsets) {
            const site = pointToHex(
              { x: body.position.x + offset.x - grid.origin.x, y: body.position.y + offset.y - grid.origin.y },
              grid.spacing,
            );
            for (const near of [site, ...hexNeighbours(site)]) {
              const owner = owners.get(hexKey(near));
              expect(owner === undefined || owner === body.id).toBe(true);
            }
            owners.set(hexKey(site), body.id);
          }
        }
      }
    }
  });

  test('starts syncing with the sink only after ten molecules land in the hub', ({ expect }) => {
    const simulation = new DataFlowSimulation(layoutDataFlow(SPEC), { seed: 19 });
    const landed = new Set<string>();
    for (let elapsed = 0; elapsed < 40; elapsed += 1 / 30) {
      simulation.step(1 / 30);
      for (const body of simulation.bodies) {
        if (body.zone === 'hub' && body.phase === 'docked') {
          landed.add(body.id);
        }
        if (body.zone === 'sink') {
          expect(landed.size).toBeGreaterThanOrEqual(10);
        }
      }
    }
    expect(simulation.bodies.some((body) => body.zone === 'sink')).toBe(true);
  });

  test('spawns agents one by one once the hub is syncing, and syncs each of them', ({ expect }) => {
    const layout = layoutDataFlow({ ...SPEC, sinks: [{ label: 'A' }, { label: 'B' }, { label: 'C' }] });
    expect(layout.sinks).toHaveLength(3);
    expect(layout.channels).toHaveLength(7);
    const simulation = new DataFlowSimulation(layout, { seed: 20, spawnAgents: { first: 2, every: 10 } });
    expect(simulation.frame().agents).toHaveLength(0);
    const counts: number[] = [];
    const synced = new Set<number>();
    for (let elapsed = 0; elapsed < 90; elapsed += 1 / 30) {
      simulation.step(1 / 30);
      const { agents } = simulation.frame();
      counts.push(agents.length);
      for (const body of simulation.bodies) {
        if (body.zone === 'sink') {
          expect(body.agent).toBeLessThan(agents.length);
          if (body.phase === 'docked' && !body.authored) {
            synced.add(body.agent ?? -1);
          }
        }
      }
    }
    // Agents only ever arrive, one at a time, until all three are there; each receives copies from the hub.
    expect(
      counts.every((count, index) => index === 0 || (count - counts[index - 1] <= 1 && count >= counts[index - 1])),
    ).toBe(true);
    expect(counts.at(-1)).toBe(3);
    expect([...synced].sort()).toEqual([0, 1, 2]);
  });

  test('feeds the monolithic agent from every source through the databases container, keeping molecules apart', ({
    expect,
  }) => {
    const layout = layoutDataFlow({
      ...SPEC,
      variant: 'silos',
      monolith: true,
      sinks: [
        { label: 'Inbox', app: 'list' },
        { label: 'Document', app: 'document' },
        { label: 'Sheets', app: 'spreadsheet' },
        { label: 'Board', app: 'kanban' },
      ],
    });
    expect(layout.monolith).toBeDefined();
    const simulation = new DataFlowSimulation(layout, { seed: 21 });
    const hues = new Set<string>();
    let closest = Infinity;
    for (let elapsed = 0; elapsed < 60; elapsed += 1 / 30) {
      simulation.step(1 / 30);
      for (const body of simulation.bodies) {
        if (body.zone === 'hub' && body.phase === 'docked') {
          hues.add(body.hue);
        }
      }
      const moving = simulation.bodies.filter((body) => body.phase === 'travelling' && body.cleared);
      for (let i = 0; i < moving.length; i++) {
        for (let j = i + 1; j < moving.length; j++) {
          closest = Math.min(
            closest,
            Math.hypot(moving[i].cursor.x - moving[j].cursor.x, moving[i].cursor.y - moving[j].cursor.y),
          );
        }
      }
    }
    expect(hues.size).toBe(4);
    expect(closest).toBeGreaterThan(30);
  });

  test('replays the same way from the same seed', ({ expect }) => {
    const layout = layoutDataFlow(SPEC);
    const first = new DataFlowSimulation(layout, { seed: 11 });
    const second = new DataFlowSimulation(layout, { seed: 11 });
    run(first, 10);
    run(second, 10);
    expect(second.bodies).toEqual(first.bodies);
  });

  test('splits the hub in place, moving its clusters whole into the new buckets', ({ expect }) => {
    const layout = layoutDataFlow({ ...SPEC, hub: { label: 'Hub', partitions: 1 } });
    const simulation = new DataFlowSimulation(layout, { seed: 4, warmup: 40 });
    const target = partitionHub(layout.hub, 3);
    const before = simulation.frame();
    const plan = planSplit(layout.hub, target, before.bodies, before.bonds, layout.hubGrid.spacing);
    expect(plan.size).toBeGreaterThan(0);
    simulation.split(target, plan);

    // A cluster lies wholly inside one bucket: no molecule, and no bond, crosses between two.
    const buckets = target.buckets ?? [];
    const bucketOf = (point: { x: number; y: number }) =>
      buckets.findIndex(
        (bucket) =>
          point.x >= bucket.x &&
          point.x <= bucket.x + bucket.width &&
          point.y >= bucket.y &&
          point.y <= bucket.y + bucket.height,
      );
    const check = () => {
      const { bodies, bonds } = simulation.frame();
      for (const body of bodies.filter((body) => body.zone === 'hub' && body.phase === 'docked')) {
        const homes = new Set(
          body.offsets.map((offset) => bucketOf({ x: body.position.x + offset.x, y: body.position.y + offset.y })),
        );
        expect(homes.size).toBe(1);
        expect(homes.has(-1)).toBe(false);
      }
      // Every bond joins two atoms that are there: none is left dangling where a molecule used to be.
      const atoms = bodies
        .filter((body) => body.zone === 'hub')
        .flatMap((body) =>
          body.offsets.map((offset) => ({ x: body.position.x + offset.x, y: body.position.y + offset.y })),
        );
      const atomAt = (point: { x: number; y: number }) =>
        atoms.some((atom) => Math.hypot(atom.x - point.x, atom.y - point.y) < 1);
      for (const bond of bonds.filter((bond) => bond.zone === 'hub' && bond.opacity > 0)) {
        expect(bucketOf(bond.from)).toBe(bucketOf(bond.to));
        expect(atomAt(bond.from) && atomAt(bond.to)).toBe(true);
      }
    };
    check();
    // What arrives afterwards lands in the buckets too.
    run(simulation, 30);
    check();
  });

  test('clamps a long frame step', () => {
    const simulation = new DataFlowSimulation(layoutDataFlow(SPEC), { seed: 1 });
    simulation.step(10);
    expect(simulation.time).toBeCloseTo(1 / 20);
  });
});
