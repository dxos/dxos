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
import { onBorder } from './semantic-route.ts';
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

  describe('edge labels', () => {
    /** Gap between a rect and a polyline of axis-aligned runs. */
    const gapTo = (rect: Rect, points: readonly Scene.Point[]) =>
      Math.min(
        ...points.slice(1).map((to, index) => {
          const from = points[index];
          const dx = Math.max(Math.min(from.x, to.x) - (rect.x + rect.w), rect.x - Math.max(from.x, to.x), 0);
          const dy = Math.max(Math.min(from.y, to.y) - (rect.y + rect.h), rect.y - Math.max(from.y, to.y), 0);
          return Math.hypot(dx, dy);
        }),
      );

    /** Each label's drawn text (the SVG renderer's narrower glyphs) with its own route. */
    const labelsOf = (objects: readonly Scene.WorldObject[]) =>
      (objects.find((entry) => entry.id === 'edges')?.elements ?? []).flatMap((element) =>
        element.kind === 'text'
          ? [
              {
                text: element.text,
                rect: { x: element.x, y: element.y, w: element.text.length * 12 * 0.58, h: 26 },
                route: pathOf(objects, element.id.replace(/-label$/, '')),
              },
            ]
          : [],
      );

    test('each label sits beside its own route and off every frame border', ({ expect }) => {
      const text = `
        diagram flow=down
        group top "Agents" {
          node Toolkit
          node Assistant below Toolkit
          node Runtime right-of Assistant
          node Link right-of Runtime
        }
        group middle "Runtime" below top {
          node Conductor below Assistant
          node Compute below Runtime
          node Edge right-of Compute
        }
        group bottom "Primitives" below middle {
          node Umbrella below Compute
          node Ai left-of Umbrella
          node Ops right-of Umbrella
        }
        edge Compute -> Umbrella "processes, triggers"
        edge Conductor -> Umbrella "graph nodes"
        edge Runtime -> Umbrella "AgentService impl"
        edge Runtime -> Compute "spawns"
        edge Edge -> Compute "remote seams"
        edge Conductor -> Assistant "wrapped by"
        edge Toolkit -> Runtime "registered in"
        edge Umbrella -> Ai
        edge Ops -> Umbrella
        edge Compute -> Link "test impl"
      `;
      const { objects } = sceneOf(text);
      const frames = ['top', 'middle', 'bottom'].map((id) => rectOf(objects, id));
      const labels = labelsOf(objects);
      expect(labels).toHaveLength(8);
      for (const { text: label, rect, route } of labels) {
        expect(route.length, label).toBeGreaterThan(1);
        expect(gapTo(rect, route), label).toBeLessThanOrEqual(16);
        expect(
          frames.some((frame) => onBorder(rect, frame, 0)),
          label,
        ).toBe(false);
      }
    });

    test('a label leaves the frame band for the gutter its route crosses', ({ expect }) => {
      const { objects } = sceneOf(PROCESS);
      const frames = ['req', 'local', 'remote'].map((id) => rectOf(objects, id));
      for (const { text: label, rect, route } of labelsOf(objects)) {
        expect(gapTo(rect, route), label).toBeLessThanOrEqual(16);
        expect(
          frames.some((frame) => onBorder(rect, frame, 0)),
          label,
        ).toBe(false);
      }
    });
  });

  describe('soft sides', () => {
    test('a preferred side is taken when it costs little', ({ expect }) => {
      const { objects, problems } = sceneOf('node A @cell(0,0)\nnode B @cell(1,1)\nedge A:~right -> B');
      expect(problems).toEqual([]);
      const a = rectOf(objects, 'A');
      expect(pathOf(objects, 'A-B-0')[0].x).toBe(a.x + a.w);
    });

    test('a preferred side gives way to a much better route, where a hard one would not', ({ expect }) => {
      const soft = sceneOf('node A @cell(0,0)\nnode B @cell(1,0)\nedge A:~bottom -> B');
      const hard = sceneOf('node A @cell(0,0)\nnode B @cell(1,0)\nedge A:bottom -> B');
      expect(soft.problems).toEqual([]);
      const a = rectOf(soft.objects, 'A');
      expect(bendsOf(pathOf(soft.objects, 'A-B-0'))).toBe(0);
      expect(pathOf(hard.objects, 'A-B-0')[0].y).toBe(a.y + a.h);
    });
  });

  describe('group shape', () => {
    const CHAIN =
      'node A  node B  node C  node D  node E  node F  edge A -> B  edge B -> C  edge C -> D  edge D -> E  edge E -> F';
    const spanOf = (objects: readonly Scene.WorldObject[], ids: readonly string[]) => {
      const rects = ids.map((id) => rectOf(objects, id));
      return {
        cols: new Set(rects.map((rect) => rect.x)).size,
        rows: new Set(rects.map((rect) => rect.y)).size,
      };
    };

    test('`compact` keeps a group near-square', ({ expect }) => {
      const { objects, problems } = sceneOf(`diagram flow=right\ngroup g compact { ${CHAIN} }`);
      expect(problems).toEqual([]);
      const { cols, rows } = spanOf(objects, ['A', 'B', 'C', 'D', 'E', 'F']);
      expect(Math.abs(cols - rows)).toBeLessThanOrEqual(1);
    });

    test('`max-width` caps the columns a group spans', ({ expect }) => {
      const { objects, problems } = sceneOf(`diagram flow=right\ngroup g max-width=2 { ${CHAIN} }`);
      expect(problems).toEqual([]);
      expect(spanOf(objects, ['A', 'B', 'C', 'D', 'E', 'F']).cols).toBeLessThanOrEqual(2);
    });

    test('`aspect` leans the whole drawing wide or tall', ({ expect }) => {
      const wide = spanOf(sceneOf(`diagram aspect=4:1\n${CHAIN}`).objects, ['A', 'B', 'C', 'D', 'E', 'F']);
      const tall = spanOf(sceneOf(`diagram aspect=1:4\n${CHAIN}`).objects, ['A', 'B', 'C', 'D', 'E', 'F']);
      expect(wide.cols).toBeGreaterThan(wide.rows);
      expect(tall.rows).toBeGreaterThan(tall.cols);
    });

    test('a frame stretched by a relation outside it is reported', ({ expect }) => {
      const { problems } = parse(`
        group upper { node X  node Y right-of X  node Z right-of Y }
        group lower below upper { node A below X  node B below Z }
        edge X -> Y
        edge Y -> Z
        edge A -> B
      `);
      expect(problems.map(({ severity, message }) => `${severity}: ${message}`).join('\n')).toMatch(
        /warning: Group "lower" is stretched/,
      );
    });
  });

  test('a fan-in bus gathers its sources into one trunk with one arrowhead', ({ expect }) => {
    const { objects, problems } = sceneOf(`
      diagram flow=down
      node A
      node B
      node C
      node D below B
      edge A, B, C -> D "spawns" bus
    `);
    expect(problems).toEqual([]);
    const [a, b, c, d] = ['A', 'B', 'C', 'D'].map((id) => rectOf(objects, id));
    expect(a.y).toBe(b.y);
    expect(c.y).toBe(b.y);
    const elements = objects.find((entry) => entry.id === 'edges')?.elements ?? [];
    const arrows = elements.filter((element) => element.kind === 'arrow');
    expect(arrows).toHaveLength(1);
    expect(arrows[0].kind === 'arrow' && arrows[0].end?.y).toBe(d.y);
    const junction = arrows[0].kind === 'arrow' ? arrows[0].start : undefined;
    for (const id of ['A-D-0', 'B-D-1', 'C-D-2']) {
      expect(pathOf(objects, id).at(-1)).toEqual(junction);
    }
    expect(elements.some((element) => element.kind === 'text' && element.text === 'spawns')).toBe(true);
  });

  test('scene statements in the same document pass through after the layout', ({ expect }) => {
    const { commands } = parse('node A\nnode B\nedge A -> B\nelements A { text note 0,-30 "hi" }');
    expect(commands[commands.length - 1]).toMatchObject({ op: 'upsert-elements', objectId: 'A' });
  });
});
