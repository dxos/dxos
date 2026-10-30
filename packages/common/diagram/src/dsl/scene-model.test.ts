//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { applyIntent } from '@dxos/scene';

import { EXEMPLAR_NAMES, EXEMPLARS } from '../testing.ts';
import { parse } from './parse.ts';
import { printScenes, readScenes } from './scene-model.ts';

const LINKS = `scene root dim=2d layout=main theme=flat {
  camera center=200,0 zoom=1
}

layout main dim=2d model=shapes {
  element a box "A" @ 0,0 surface=solid
  element b rect "B" @ 200,0 size=100x60
  element ab link from=a to=b end=arrow
}

model shapes dim=2d {
  object box rect size=100x60 border=true rounded=true
}
`;

describe('readScenes', () => {
  test('a group is a composite placed by an element with no fit; links to its members end on its ports', () => {
    const { document } = readScenes(EXEMPLARS.cluster);
    const cluster = document.layouts.find((layout) => layout.id === 'cluster');
    const parts = document.layouts.find((layout) => layout.id === 'cluster/team');
    expect(cluster?.elements.team).toEqual({ id: 'team', object: 'cluster/team', fit: 'none' });
    expect(cluster?.elements.l1?.target).toEqual({ node: 'team', port: 's1' });
    expect(parts).toMatchObject({ kind: 'composite', anonymous: true, model: 'nodes', arrange: { kind: 'ring' } });
    expect(Object.keys(parts?.elements ?? {})).toEqual(['s1', 's2', 's3', 's4']);
    const model = document.models.find((candidate) => candidate.id === 'nodes');
    expect(model?.objects['cluster/team']).toEqual({ id: 'cluster/team', type: 'group', parts: 'cluster/team' });
  });

  test('a layout with groups and no model gets one made for its groups, which printing leaves out', () => {
    const { document } = readScenes(EXEMPLARS.hierarchy);
    expect(document.layouts.find((layout) => layout.id === 'team-b')?.model).toBe('team-b/groups');
    expect(printScenes(document)).toBe(EXEMPLARS.hierarchy);
  });

  test('reads a scene, the layout it views and the model the layout places objects from', () => {
    const { document, problems } = readScenes(LINKS);
    expect(problems).toEqual([]);
    expect(document.scenes).toEqual([
      { id: 'root', dim: '2d', theme: 'flat', layout: 'main', camera: { center: { x: 200, y: 0 }, zoom: 1 } },
    ]);
    const [layout] = document.layouts;
    expect(layout).toMatchObject({ id: 'main', dim: '2d', model: 'shapes' });
    expect(layout.elements.a).toEqual({
      id: 'a',
      object: 'box',
      label: 'A',
      center: { x: 0, y: 0 },
      // A 2D surface is the canvas's fill.
      overrides: { fill: true },
    });
    expect(layout.elements.b).toMatchObject({ type: 'rect', size: { width: 100, height: 60 } });
    expect(layout.elements.ab).toMatchObject({
      type: 'link',
      source: { node: 'a' },
      target: { node: 'b' },
      props: { end: 'arrow' },
    });
    expect(document.models).toEqual([
      {
        id: 'shapes',
        dim: '2d',
        objects: {
          box: {
            id: 'box',
            type: 'rect',
            size: { width: 100, height: 60 },
            overrides: { border: true, rounded: true },
          },
        },
      },
    ]);
  });

  test('reads a 3D point, a WxHxD scale and an object with parts', () => {
    const { document, problems } = readScenes(`scene s dim=3d layout=l {
  camera target=0,0,0 yaw=-45 pitch=30 distance=14 fov=0.8 projection=perspective
}

layout l dim=3d model=m {
  element c cube @ 1,2,3 scale=2x1x0.5 rotation=0,45,0
  element t team @ 4,0,0
}

layout inner dim=3d {
}

model m dim=3d {
  object team sphere scale=3 parts=inner
}
`);
    expect(problems).toEqual([]);
    expect(document.layouts[0].elements.c).toMatchObject({
      center: { x: 1, y: 2, z: 3 },
      scale: { x: 2, y: 1, z: 0.5 },
      rotation: { x: 0, y: 45, z: 0 },
    });
    expect(document.layouts[0].elements.t).toMatchObject({ object: 'team' });
    expect(document.models[0].objects.team).toEqual({
      id: 'team',
      type: 'sphere',
      scale: { x: 3, y: 3, z: 3 },
      parts: 'inner',
    });
  });

  test('an id called scene, layout or model still parses in an object statement', () => {
    const { problems } = parse('object scene {\n  rect layout 0,0 10x10\n  rect model 0,0 10x10\n}\n');
    expect(problems).toEqual([]);
  });

  test('reports a link to a missing element', () => {
    const { problems } = readScenes(`layout s dim=2d {
  element ab link from=a to=b
}
`);
    expect(problems.map((problem) => problem.message).join()).toContain('"a"');
  });

  test("reports a scene whose layout is missing, at the scene's statement", () => {
    const text = 'scene s dim=2d layout=gone {\n  camera center=0,0 zoom=1\n}\n';
    const { problems } = readScenes(text);
    expect(problems).toMatchObject([{ message: 'Layout "gone" is not in the document.', from: 0 }]);
  });
});

test('readScenes reports a cycle through composite objects', () => {
  const { problems } = readScenes(`scene s dim=2d layout=a {
  camera center=0,0 zoom=1
}

layout a dim=2d model=m {
  element to-b of-b @ 0,0 size=10x10
}

layout b dim=2d model=m {
  element to-a of-a @ 0,0 size=10x10
}

model m dim=2d {
  object of-a rect parts=a
  object of-b rect parts=b
}
`);
  expect(problems.map((problem) => problem.message).join()).toContain('cycle');
});

describe('printScenes', () => {
  test.each(EXEMPLAR_NAMES)('round-trips %s', (name) => {
    const { document, problems } = readScenes(EXEMPLARS[name]);
    expect(problems).toEqual([]);
    expect(printScenes(document)).toBe(EXEMPLARS[name]);
  });

  test('an intent-only cluster prints with positions', () => {
    const intent = EXEMPLARS.cluster.replace(/(element s\d spoke "S\d") @ [^ \n]+/g, '$1');
    expect(intent).not.toBe(EXEMPLARS.cluster);
    const { document, problems } = readScenes(intent);
    expect(problems).toEqual([]);
    expect(printScenes(document)).toBe(EXEMPLARS.cluster);
  });

  test('solids made by solid intents print and read back unchanged', () => {
    const { document } = readScenes(EXEMPLARS.solid);
    const [layout] = document.layouts;
    expect(layout.dim).toBe('3d');
    if (layout.dim !== '3d') {
      return;
    }
    const base = {
      ...layout,
      elements: Object.fromEntries(Object.entries(layout.elements).filter(([id]) => id === 'box' || id === 'hole')),
    };
    const after = applyIntent(applyIntent(base, { kind: 'subtract', id: 'cut', base: 'box', tool: 'hole' }), {
      kind: 'extrude',
      id: 'lip',
      target: 'cut',
      face: { x: 0, y: 1, z: 0 },
      distance: 0.25,
    });
    const edited = { ...document, layouts: [after] };
    const read = readScenes(printScenes(edited));
    expect(read.problems).toEqual([]);
    expect(read.document.layouts[0]).toEqual(after);
  });
});
