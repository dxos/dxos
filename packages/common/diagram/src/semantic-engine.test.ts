//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import { analyze, errors } from './diagnostics.ts';
import { compile, parse, toScene } from './dsl/index.ts';
import * as MermaidEngine from './mermaid-engine.ts';
import type * as Scene from './scene.ts';
import { measureBox, pitchFor } from './semantic-engine.ts';
import * as Semantic from './semantic.ts';

type Rect = { x: number; y: number; w: number; h: number };

const sceneOf = (text: string) => {
  const { commands, problems } = parse(text);
  return { objects: toScene(commands).objects, problems };
};

/** Absolute rect of an object's first box. */
const rectOf = (objects: readonly Scene.WorldObject[], id: string): Rect => {
  const object = objects.find((entry) => entry.id === id);
  const box = object?.elements.find(
    (element): element is Scene.Box => element.kind === 'rect' || element.kind === 'ellipse',
  );
  if (!object || !box) {
    throw new Error(`no box for ${id}`);
  }
  return { x: (object.origin?.x ?? 0) + box.x, y: (object.origin?.y ?? 0) + box.y, w: box.w, h: box.h };
};

/** A connector's whole polyline: its `-path` line (if any) joined with its arrow, or a bare line. */
const pathOf = (objects: readonly Scene.WorldObject[], id: string): Scene.Point[] => {
  const elements = objects.find((entry) => entry.id === 'edges')?.elements ?? [];
  const line = elements.find(
    (element) => element.id === `${id}-path` || (element.id === id && element.kind === 'line'),
  );
  const arrow = elements.find((element) => element.id === id && element.kind === 'arrow');
  const prefix = line?.kind === 'line' ? line.points : [];
  const head = arrow?.kind === 'arrow' && arrow.start && arrow.end ? [arrow.start, arrow.end] : [];
  return [...prefix.slice(0, head.length ? -1 : undefined), ...head];
};

const bendsOf = (points: readonly Scene.Point[]) => Math.max(0, points.length - 2);

const contains = (outer: Rect, inner: Rect) =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.w <= outer.x + outer.w &&
  inner.y + inner.h <= outer.y + outer.h;

const intersects = (left: Rect, right: Rect) =>
  left.x < right.x + right.w && right.x < left.x + left.w && left.y < right.y + right.h && right.y < left.y + left.h;

const PROCESS = `
diagram flow=down
group req "Requesters" {
  node TrigDisp "TriggerDispatcher"
  node AgentSvc "AgentService" right-of TrigDisp
}
group local "Local runtime" below req {
  node PM "ProcessManager" below AgentSvc
  node OpInvoker "ProcOpInvoker" right-of PM
  node LocalHandle "ProcessHandle" below PM
  node Store "ProcessStore" left-of LocalHandle
  node ProcDef "Process def" right-of LocalHandle
}
group remote "EDGE runtime" right-of local {
  node RPM "RemoteProcessMgr"
  node RHandle "RemoteProcHandle" right-of RPM
  node Queued "QueuedRemoteCtl" below RHandle
  node EdgeCtl "EdgeProcControl" left-of Queued
}
edge AgentSvc -> PM "spawn local"
edge AgentSvc -> RPM:top "spawn on EDGE"
edge TrigDisp -> PM "spawn"
edge PM -> LocalHandle "owns, no cap"
edge PM -> Store "persist"
edge PM -> OpInvoker
edge OpInvoker -> PM "spawn child"
edge LocalHandle -> ProcDef "run"
edge LocalHandle -> Store "delete on exit"
edge RPM -> RHandle "make"
edge RHandle -> Queued "control"
edge Queued -> EdgeCtl "deliver"
`;

describe('semantic engine', { timeout: 120_000 }, () => {
  test('cell pins land on their cell and exact pins on their point', ({ expect }) => {
    const { objects, problems } = sceneOf('node A @cell(2,1)\nnode B @ 0,0\nedge A -> B');
    expect(problems).toEqual([]);
    const pitch = pitchFor(measureBox(['A', 'B']));
    expect(rectOf(objects, 'A')).toMatchObject({ x: 2 * pitch.w, y: pitch.h });
    expect(rectOf(objects, 'B')).toMatchObject({ x: 0, y: 0 });
  });

  test('relations hold', ({ expect }) => {
    const { objects } = sceneOf(`
      node Hub
      node East right-of Hub
      node South below Hub
      node West left-of Hub
      node North above Hub
      node Far same-row South
      edge Hub -> East
      edge Hub -> South
    `);
    const [hub, east, south, west, north, far] = ['Hub', 'East', 'South', 'West', 'North', 'Far'].map((id) =>
      rectOf(objects, id),
    );
    expect(east.y).toBe(hub.y);
    expect(east.x).toBeGreaterThan(hub.x);
    expect(south.x).toBe(hub.x);
    expect(south.y).toBeGreaterThan(hub.y);
    expect(west.y).toBe(hub.y);
    expect(west.x).toBeLessThan(hub.x);
    expect(north.x).toBe(hub.x);
    expect(north.y).toBeLessThan(hub.y);
    expect(far.y).toBe(south.y);
  });

  test('a group is a unit: its frame holds its members and no other box', ({ expect }) => {
    const { objects } = sceneOf(`
      group g "G" { node A  node B  node C  edge A -> B  edge B -> C }
      node X  node Y
      edge X -> A
      edge C -> Y
      edge X -> Y
    `);
    const frame = rectOf(objects, 'g');
    for (const id of ['A', 'B', 'C']) {
      expect(contains(frame, rectOf(objects, id))).toBe(true);
    }
    for (const id of ['X', 'Y']) {
      expect(intersects(frame, rectOf(objects, id))).toBe(false);
    }
  });

  test('groups are placed relative to each other', ({ expect }) => {
    const { objects } = sceneOf(`
      group a "A" { node A1  node A2 below A1 }
      group b "B" right-of a gap=64 { node B1 }
      edge A1 -> B1
    `);
    const [a, b] = [rectOf(objects, 'a'), rectOf(objects, 'b')];
    expect(b.x).toBeGreaterThanOrEqual(a.x + a.w + 64);
  });

  test('allowed sides constrain the ports', ({ expect }) => {
    const { objects } = sceneOf('node A @cell(0,0)\nnode B @cell(1,1)\nedge A:left -> B:bottom');
    const [a, b] = [rectOf(objects, 'A'), rectOf(objects, 'B')];
    const points = pathOf(objects, 'A-B-0');
    expect(points[0].x).toBe(a.x);
    expect(points[points.length - 1].y).toBe(b.y + b.h);
  });

  test('a waypoint pins a coordinate of the route', ({ expect }) => {
    const { objects, problems } = sceneOf('node A @cell(0,0)\nnode B @cell(2,1)\nedge A:right -> B:top via 256,_');
    expect(problems).toEqual([]);
    const points = pathOf(objects, 'A-B-0');
    const verticalAt = points.slice(1).some((point, index) => point.x === 256 && points[index].x === 256);
    expect(verticalAt).toBe(true);
    expect(points[points.length - 1].y).toBe(rectOf(objects, 'B').y);
  });

  test('a waypoint no route can honour is reported, and the edge is still drawn', ({ expect }) => {
    // A run at y=-900 lies far above B, so no route from it can come back up into B's bottom side.
    const { objects, problems } = sceneOf('node B @cell(0,0)\nnode A @cell(0,1)\nedge A:left -> B:bottom via _,-900');
    expect(problems.map(({ severity }) => severity)).toEqual(['warning']);
    expect(pathOf(objects, 'A-B-0').length).toBeGreaterThan(1);
  });

  test('a channel waypoint in cell units runs through the gutter', ({ expect }) => {
    const { objects } = sceneOf('node A @cell(0,0)\nnode B @cell(0,2)\nnode X @cell(0,1)\nedge A -> B via cell(0.5,_)');
    const [a, x] = [rectOf(objects, 'A'), rectOf(objects, 'X')];
    const points = pathOf(objects, 'A-B-0');
    const channel = points.find((point, index) => index > 0 && point.x === points[index - 1].x && point.x > a.x + a.w);
    expect(channel).toBeDefined();
    expect(channel && channel.x).toBeGreaterThan(x.x + x.w);
  });

  test('a bus fans out of one trunk', ({ expect }) => {
    const { objects } = sceneOf(`
      node Hub @cell(1,0)
      node A @cell(0,1)
      node B @cell(1,1)
      node C @cell(2,1)
      edge Hub -> A, B, C "fan" bus
    `);
    const elements = objects.find((entry) => entry.id === 'edges')?.elements ?? [];
    const trunk = elements.find((element) => element.kind === 'line' && element.id.endsWith('-trunk'));
    expect(trunk?.kind).toBe('line');
    const junction = trunk?.kind === 'line' ? trunk.points[trunk.points.length - 1] : undefined;
    for (const id of ['Hub-A-0', 'Hub-B-1', 'Hub-C-2']) {
      expect(pathOf(objects, id)[0]).toEqual(junction);
    }
    expect(elements.some((element) => element.kind === 'text' && element.text === 'fan')).toBe(true);
  });

  describe('inheritance', () => {
    const connectorsOf = (objects: readonly Scene.WorldObject[]) =>
      objects.find((entry) => entry.id === 'edges')?.elements ?? [];

    test('subtypes of one abstraction share a row under it', ({ expect }) => {
      const { objects } = sceneOf(`
        diagram flow=down
        node Animal
        node Dog
        node Cat
        node Fish
        edge Dog extends Animal
        edge Cat extends Animal
        edge Fish extends Animal
      `);
      const [animal, dog, cat, fish] = ['Animal', 'Dog', 'Cat', 'Fish'].map((id) => rectOf(objects, id));
      expect(cat.y).toBe(dog.y);
      expect(fish.y).toBe(dog.y);
      expect(dog.y).toBeGreaterThan(animal.y + animal.h);
    });

    test('subtypes gather into one trunk with one triangle at the abstraction', ({ expect }) => {
      const { objects } = sceneOf(`
        node Animal @cell(1,0)
        node Dog @cell(0,1)
        node Cat @cell(2,1)
        edge Dog extends Animal
        edge Cat extends Animal
      `);
      const [animal, dog, cat] = ['Animal', 'Dog', 'Cat'].map((id) => rectOf(objects, id));
      const elements = connectorsOf(objects);
      const arrows = elements.filter((element) => element.kind === 'arrow');
      expect(arrows).toHaveLength(1);
      const [arrow] = arrows;
      expect(arrow.kind === 'arrow' && arrow.relation).toBe('inheritance');
      expect(arrow.kind === 'arrow' && arrow.end).toEqual({ x: animal.x + animal.w / 2, y: animal.y + animal.h });
      const trunk = pathOf(objects, arrow.id);
      const junction = trunk[0];
      for (const [id, rect] of [
        ['Dog-Animal-0', dog],
        ['Cat-Animal-1', cat],
      ] as const) {
        const spoke = pathOf(objects, id);
        expect(spoke[0].y).toBe(rect.y);
        expect(spoke[spoke.length - 1]).toEqual(junction);
      }
    });

    test('a single subtype keeps its own straight edge', ({ expect }) => {
      const { objects } = sceneOf('node Animal @cell(0,0)\nnode Dog @cell(0,1)\nedge Dog extends Animal');
      const elements = connectorsOf(objects);
      expect(elements.some((element) => element.id.endsWith('-trunk'))).toBe(false);
      expect(bendsOf(pathOf(objects, 'Dog-Animal-0'))).toBe(0);
    });

    test('explicit hints win over the shared row and the trunk', ({ expect }) => {
      const { objects } = sceneOf(`
        diagram flow=down
        node Animal
        node Dog below Animal
        node Cat right-of Animal
        edge Dog extends Animal
        edge Cat:left extends Animal:right
      `);
      const [animal, dog, cat] = ['Animal', 'Dog', 'Cat'].map((id) => rectOf(objects, id));
      expect(cat.y).toBe(animal.y);
      expect(dog.y).toBeGreaterThan(animal.y);
      expect(connectorsOf(objects).filter((element) => element.kind === 'arrow')).toHaveLength(2);
      const route = pathOf(objects, 'Cat-Animal-1');
      expect(route[0].x).toBe(cat.x);
      expect(route[route.length - 1].x).toBe(animal.x + animal.w);
    });
  });

  describe('port significance', () => {
    const FACE = 'node Hub @cell(1,0)\nnode Left @cell(0,1)\nnode Right @cell(2,1)\n';

    test('relations rank from inheritance down to dependency', ({ expect }) => {
      const ranked = [
        Semantic.significance('inheritance'),
        Semantic.significance('composition'),
        Semantic.significance('aggregation'),
        Semantic.significance(undefined),
        Semantic.significance('dependency'),
      ];
      expect(ranked).toEqual([...ranked].sort((left, right) => right - left));
      expect(new Set(ranked).size).toBe(ranked.length);
      expect(Semantic.significance('implementation')).toBe(Semantic.significance('inheritance'));
      expect(Semantic.significance(undefined, 'dashed')).toBe(Semantic.significance('dependency'));
    });

    test('the more significant of two edges on one face enters at its centre', ({ expect }) => {
      for (const [statements, central, aside] of [
        ['edge Left:top depends-on Hub:bottom\nedge Right:top composes Hub:bottom', 'Right-Hub-1', 'Left-Hub-0'],
        ['edge Left:top composes Hub:bottom\nedge Right:top depends-on Hub:bottom', 'Left-Hub-0', 'Right-Hub-1'],
      ] as const) {
        const { objects } = sceneOf(`${FACE}${statements}`);
        const hub = rectOf(objects, 'Hub');
        const [centralEnd, asideEnd] = [central, aside].map((id) => pathOf(objects, id).at(-1));
        expect(centralEnd).toEqual({ x: hub.x + hub.w / 2, y: hub.y + hub.h });
        expect(asideEnd?.y).toBe(hub.y + hub.h);
        expect(asideEnd?.x).not.toBe(hub.x + hub.w / 2);
        expect(analyze(objects).metrics.crossings).toBe(0);
      }
    });

    test('edges of equal significance keep their order, centred on the face', ({ expect }) => {
      const { objects } = sceneOf(`${FACE}edge Left:top -> Hub:bottom\nedge Right:top -> Hub:bottom`);
      const hub = rectOf(objects, 'Hub');
      const [left, right] = ['Left-Hub-0', 'Right-Hub-1'].map((id) => pathOf(objects, id).at(-1)?.x ?? NaN);
      expect(left).toBeLessThan(right);
      expect(left + right).toBe(2 * (hub.x + hub.w / 2));
    });

    test('an inheritance trunk leaves the subtype from its centre beside a dependency', ({ expect }) => {
      const { objects } = sceneOf(`
        diagram flow=down
        node Animal
        node Dog below Animal
        node Cat right-of Dog
        node Logger above Cat
        edge Dog extends Animal
        edge Cat extends Animal
        edge Cat depends-on Logger
      `);
      const cat = rectOf(objects, 'Cat');
      const centre = { x: cat.x + cat.w / 2, y: cat.y };
      expect(pathOf(objects, 'Cat-Animal-1')[0]).toEqual(centre);
      const logger = pathOf(objects, 'Cat-Logger-2')[0];
      expect(logger.y).toBe(cat.y);
      expect(logger.x).not.toBe(centre.x);
    });
  });

  test('stacked boxes connect side to side down the free channel instead of snaking', ({ expect }) => {
    const stack = 'node A @cell(0,0)\nnode X @cell(0,1)\nnode B @cell(0,2)\nedge A -> X\nedge X -> B\n';
    const free = sceneOf(`${stack}edge A -> B`).objects;
    const forced = sceneOf(`${stack}edge A:bottom -> B:top`).objects;
    const [a, b] = [rectOf(free, 'A'), rectOf(free, 'B')];
    const route = pathOf(free, 'A-B-2');
    // Left to left (or right to right): one U through the channel beside X.
    expect(bendsOf(route)).toBe(2);
    expect([a.x, a.x + a.w]).toContain(route[0].x);
    expect(route[route.length - 1].x).toBe(route[0].x === a.x ? b.x : b.x + b.w);
    expect(bendsOf(pathOf(forced, 'A-B-2'))).toBeGreaterThan(bendsOf(route));
    expect(errors(analyze(free))).toEqual([]);
  });

  test('end to end: an intent-level diagram lays out without defects', ({ expect }) => {
    const { objects, problems } = sceneOf(PROCESS);
    expect(problems).toEqual([]);
    const report = analyze(objects);
    expect(errors(report)).toEqual([]);
    expect(report.metrics.crossings).toBe(0);
    expect(report.metrics.bends).toBeLessThanOrEqual(4);
  });

  test('compile without hints is no worse than the mermaid engine', async ({ expect }) => {
    const text = PROCESS.replace(/ (right-of|left-of|below|above) \w+/g, '').replace(/:top/g, '');
    const { commands, problems } = await EffectEx.runPromise(compile(text));
    expect(problems).toEqual([]);
    const ours = analyze(toScene(commands).objects);
    const mermaid = `flowchart TB
  subgraph req [Requesters]
    TrigDisp[TriggerDispatcher]
    AgentSvc[AgentService]
  end
  subgraph local [Local runtime]
    PM[ProcessManager]
    OpInvoker[ProcOpInvoker]
    LocalHandle[ProcessHandle]
    Store[ProcessStore]
    ProcDef[Process def]
  end
  subgraph remote [EDGE runtime]
    RPM[RemoteProcessMgr]
    RHandle[RemoteProcHandle]
    Queued[QueuedRemoteCtl]
    EdgeCtl[EdgeProcControl]
  end
  AgentSvc -->|spawn local| PM
  AgentSvc -->|spawn on EDGE| RPM
  TrigDisp -->|spawn| PM
  PM -->|owns, no cap| LocalHandle
  PM -->|persist| Store
  PM --> OpInvoker
  OpInvoker -->|spawn child| PM
  LocalHandle -->|run| ProcDef
  LocalHandle -->|delete on exit| Store
  RPM -->|make| RHandle
  RHandle -->|control| Queued
  Queued -->|deliver| EdgeCtl`;
    const engine = analyze(toScene(await MermaidEngine.compile(mermaid)).objects);
    expect(errors(ours)).toEqual([]);
    expect(ours.metrics.crossings).toBeLessThanOrEqual(engine.metrics.crossings);
    expect(ours.metrics.crossings * 3 + ours.metrics.bends).toBeLessThanOrEqual(
      engine.metrics.crossings * 3 + engine.metrics.bends,
    );
  });

  test('scene statements in the same document pass through after the layout', ({ expect }) => {
    const { commands } = parse('node A\nnode B\nedge A -> B\nelements A { text note 0,-30 "hi" }');
    expect(commands[commands.length - 1]).toMatchObject({ op: 'upsert-elements', objectId: 'A' });
  });
});
