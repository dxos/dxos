//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type Scene as Model, applyIntent } from '@dxos/scene';

import { EXEMPLAR_NAMES, EXEMPLARS } from '../testing.ts';
import { parse } from './parse.ts';
import { printScenes, readScenes } from './scene-model.ts';

const LINKS = `scene root dim=2d layout=main theme=flat {
  camera center=200,0 zoom=1
}

layout main dim=2d model=shapes {
  element a box "A" @ 0,0 fill=solid
  element b rect "B" @ 200,0 size=100x60
  element ab link from=a to=b end=arrow
}

model shapes dim=2d {
  object box rect size=100x60 stroke=solid corners=all
}
`;

const COMPOSITE = `scene root dim=2d layout=board {
  camera center=0,0 zoom=1
}

layout board dim=2d model=composites {
  element one tile @ 0,0 size=288x192
  element two tile @ 384,0 size=288x384
}

composite tile size=288x192 name="Tile" {
  element frame rect @ 0,0 size=288x192 constrain=stretch corners=all
  element icon icon @ -126,-78 size=36x36 constrain=min
  element title note "Card" @ -24,-78 size=204x24 constrain=stretch,min
  element body note "Body" @ 0,6 size=264x84 constrain=stretch
  element footer note "Footer" @ 0,87 size=264x18 constrain=stretch,max
}
`;

describe('composite statements', () => {
  test('a composite is a named composite layout and the instance object that places it', () => {
    const { document, problems } = readScenes(COMPOSITE);
    expect(problems).toEqual([]);
    const parts = document.layouts.find((layout) => layout.id === 'tile');
    expect(parts).toMatchObject({ dim: '2d', kind: 'composite', name: 'Tile' });
    expect(parts?.anonymous).toBeUndefined();
    expect(Object.keys(parts?.elements ?? {})).toEqual(['frame', 'icon', 'title', 'body', 'footer']);
    const model = document.models.find((candidate) => candidate.id === 'composites');
    expect(model?.dim === '2d' && model.objects.tile).toEqual({
      id: 'tile',
      kind: 'instance',
      parts: 'tile',
      size: { width: 288, height: 192 },
    });
  });

  test('a layout places a composite by naming it, at a size of its own', () => {
    const { document } = readScenes(COMPOSITE);
    const board = document.layouts.find((layout) => layout.id === 'board');
    expect(board?.elements.one).toEqual({
      id: 'one',
      object: 'tile',
      center: { x: 0, y: 0 },
      size: { width: 288, height: 192 },
    });
    expect(board?.elements.two?.size).toEqual({ width: 288, height: 384 });
  });

  test('constraints read per axis, and one word sets both', () => {
    const { document } = readScenes(COMPOSITE);
    const parts = document.layouts.find((layout) => layout.id === 'tile');
    expect(parts?.elements.frame?.constrain).toEqual({ x: 'stretch', y: 'stretch' });
    expect(parts?.elements.icon?.constrain).toEqual({ x: 'min', y: 'min' });
    expect(parts?.elements.title?.constrain).toEqual({ x: 'stretch', y: 'min' });
    expect(parts?.elements.footer?.constrain).toEqual({ x: 'stretch', y: 'max' });
  });

  test('a composite round-trips through the text, constraints and all', () => {
    const { document } = readScenes(COMPOSITE);
    expect(printScenes(document)).toBe(COMPOSITE);
  });

  test("a 2D element's text size and alignment are read into its style and printed back, beside its other look", () => {
    const source = `composite c {
  element title note "Card" @ 0,0 size=100x24 fontSize=18 valign=middle constrain=stretch,min
  element tag note "New" @ 0,30 size=100x24 fontSize=14 corners=all
  element plain note "Body" @ 0,60 size=100x24
}
`;
    const { document, problems } = readScenes(source);
    expect(problems).toEqual([]);
    const parts = document.layouts.find((layout) => layout.id === 'c');
    expect(parts?.elements.title?.overrides).toEqual({ fontSize: 18, valign: 'middle' });
    // A word that is no alignment is reported, and not stored.
    const bad = readScenes('composite d {\n  element a note "A" @ 0,0 size=10x10 valign=centre\n}\n');
    expect(bad.problems.map((problem) => problem.message)).toEqual(['valign must be one of top, middle, bottom.']);
    expect(bad.document.layouts.find((layout) => layout.id === 'd')?.elements.a?.overrides).toBeUndefined();
    expect(parts?.elements.tag?.overrides).toMatchObject({ fontSize: 14, corners: 'all' });
    // Not a field of the element's own: it is the style's, as it is set from the Properties panel.
    expect(parts?.elements.title?.props).toBeUndefined();
    expect(parts?.elements.plain?.overrides).toBeUndefined();
    expect(printScenes(document)).toBe(source);
  });

  test('an axis set to scale is the default, so it is neither stored nor printed', () => {
    const { document, problems } = readScenes(`composite c {
  element a rect @ 0,0 size=10x10 constrain=scale
  element b rect @ 0,0 size=10x10 constrain=min,scale
}
`);
    expect(problems).toEqual([]);
    const parts = document.layouts.find((layout) => layout.id === 'c');
    expect(parts?.elements.a?.constrain).toBeUndefined();
    expect(parts?.elements.b?.constrain).toEqual({ x: 'min' });
    expect(printScenes(document)).toContain('constrain=min,scale');
  });

  test('a polyline authors its vertices as fractions of its own frame, and they round-trip', () => {
    const source = `composite c {
  element rule polyline @ 0,60 size=264x1 constrain=stretch,max points="0,0.5 1,0.5"
}
`;
    const { document, problems } = readScenes(source);
    expect(problems).toEqual([]);
    const parts = document.layouts.find((layout) => layout.id === 'c');
    expect(parts?.elements.rule?.props?.points).toEqual([
      { x: 0, y: 0.5 },
      { x: 1, y: 0.5 },
    ]);
    expect(printScenes(document)).toContain('points="0,0.5 1,0.5"');
  });

  test('a prop that is a list but not points is left alone, rather than printed as one', () => {
    // The same vertices under a name no attribute claims. Only `points` has a spelling the reader reads back,
    // so any other list is dropped rather than printed as a string the reader would hand back verbatim.
    const document: Model.SceneDocument = {
      scenes: [],
      layouts: [
        {
          id: 'c',
          dim: '2d',
          kind: 'composite',
          elements: {
            rule: {
              id: 'rule',
              kind: 'polyline',
              center: { x: 0, y: 0 },
              size: { width: 10, height: 1 },
              props: {
                vertices: [
                  { x: 0, y: 0.5 },
                  { x: 1, y: 0.5 },
                ],
              },
            },
          },
        },
      ],
      models: [],
    };
    const printed = printScenes(document);
    expect(printed).toContain('element rule polyline');
    expect(printed).not.toContain('vertices=');
  });

  test('points that are not pairs are reported', () => {
    const { problems } = readScenes(`composite c {
  element rule polyline @ 0,0 size=10x1 points="0,0.5"
}
`);
    expect(problems).toHaveLength(1);
    expect(problems[0]?.message).toContain('points takes');
  });

  test('a word that is not a constraint is reported', () => {
    const { problems } = readScenes(`composite c {
  element a rect @ 0,0 size=10x10 constrain=sideways
}
`);
    expect(problems).toHaveLength(1);
    expect(problems[0]?.message).toContain('constrain takes');
  });
});

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
    expect(model?.objects['cluster/team']).toEqual({ id: 'cluster/team', kind: 'group', parts: 'cluster/team' });
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
      overrides: { fill: 'solid' },
    });
    expect(layout.elements.b).toMatchObject({ kind: 'rect', size: { width: 100, height: 60 } });
    expect(layout.elements.ab).toMatchObject({
      kind: 'link',
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
            kind: 'rect',
            size: { width: 100, height: 60 },
            overrides: { stroke: 'solid', corners: 'all' },
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
      kind: 'sphere',
      scale: { x: 3, y: 3, z: 3 },
      parts: 'inner',
    });
  });

  test('an object whose aspect is locked says so, and keeps it through a write and a read', () => {
    const text = `model m dim=3d {
  object taxi cube scale=5 lockAspect=true
}
`;
    const { document, problems } = readScenes(text);
    expect(problems).toEqual([]);
    expect(document.models[0].objects.taxi).toEqual({
      id: 'taxi',
      kind: 'cube',
      scale: { x: 5, y: 5, z: 5 },
      lockAspect: true,
    });
    expect(readScenes(printScenes(document)).document.models[0].objects.taxi).toEqual(document.models[0].objects.taxi);
  });

  test('a look is a colour, a fill, a stroke and its corners, in either dimension', () => {
    const text = `layout flat dim=2d {
  element a rect @ 0,0 size=10x10 color=blue/1 fill=tint stroke=dashed corners=top opacity=0.5
  element b rect @ 0,0 size=10x10 color="#1e90ff" fill=none stroke=none
}

layout solid dim=3d {
  element c cube @ 0,0,0 color=teal fill=glass stroke=solid corners=all
}
`;
    const { document, problems } = readScenes(text);
    expect(problems).toEqual([]);
    const [flat, solid] = document.layouts;
    expect(flat.elements.a?.overrides).toEqual({
      color: 'blue/1',
      fill: 'tint',
      stroke: 'dashed',
      corners: 'top',
      opacity: 0.5,
    });
    expect(flat.elements.b?.overrides).toEqual({ color: '#1e90ff', fill: 'none', stroke: 'none' });
    expect(solid.elements.c?.overrides).toEqual({ color: 'teal', fill: 'glass', stroke: 'solid', corners: 'all' });
    expect(printScenes(document)).toBe(text);
  });

  test('a word no fill, stroke, corner or colour is spelled as is reported, and not stored', () => {
    const { document, problems } = readScenes(`layout flat dim=2d {
  element a rect @ 0,0 size=10x10 fill=puce stroke=wavy corners=some color=Blue
}
`);
    expect(problems.map((problem) => problem.message)).toEqual([
      'color must be a name (blue), a name at a tone (blue/2), or a quoted CSS colour.',
      'fill must be one of none, solid, tint, pattern, glass.',
      'stroke must be one of none, solid, dashed, dotted, sketchy.',
      'corners must be one of all, top, bottom, none.',
    ]);
    expect(document.layouts[0].elements.a?.overrides).toBeUndefined();
  });

  test('text written in the older words reads as the look it meant, and prints in the current ones', () => {
    // A hue and a tone were stated apart, a 3D surface was the fill, and a flag said the border and the corners.
    const { document, problems } = readScenes(`layout flat dim=2d {
  element a rect @ 0,0 size=10x10 hue=blue tone=1 surface=tint border=true rounded=true
  element b note "B" @ 0,0 size=10x10 tone=0 border=false rounded=false alignHorizontal=right alignVertical=bottom
}

layout solid dim=3d model=m {
  element c cube @ 0,0,0 hue=amber surface=glass border=true
}

model m dim=3d {
  object ball sphere hue=violet surface=solid
}
`);
    expect(problems).toEqual([]);
    const [flat, solid] = document.layouts;
    expect(flat.elements.a?.overrides).toEqual({ color: 'blue/1', fill: 'tint', stroke: 'solid', corners: 'all' });
    expect(flat.elements.b?.overrides).toEqual({
      color: 'default/0',
      stroke: 'none',
      corners: 'none',
      align: 'right',
      valign: 'bottom',
    });
    // None of the older words is left over as a prop of the element.
    expect(flat.elements.a?.props).toBeUndefined();
    expect(flat.elements.b?.props).toBeUndefined();
    expect(solid.elements.c?.overrides).toEqual({ color: 'amber', fill: 'glass', stroke: 'solid' });
    expect(document.models[0].objects.ball?.overrides).toEqual({ color: 'violet', fill: 'solid' });
    expect(printScenes(document)).toBe(`layout flat dim=2d {
  element a rect @ 0,0 size=10x10 color=blue/1 fill=tint stroke=solid corners=all
  element b note "B" @ 0,0 size=10x10 align=right valign=bottom color=default/0 stroke=none corners=none
}

layout solid dim=3d model=m {
  element c cube @ 0,0,0 color=amber fill=glass stroke=solid
}

model m dim=3d {
  object ball sphere color=violet fill=solid
}
`);
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
