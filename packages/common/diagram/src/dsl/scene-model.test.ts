//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { parse } from './parse.ts';
import { readScenes } from './scene-model.ts';

const LINKS = `scene root dim=2d theme=flat {
  camera center=200,0 zoom=1
  element a rect "A" @ 0,0 size=100x60 surface=solid border=true rounded=true
  element b rect "B" @ 200,0 size=100x60
  element ab link from=a to=b end=arrow
}
`;

describe('readScenes', () => {
  test('parses a 2D scene with a camera and three elements', () => {
    const { document, problems } = readScenes(LINKS);
    expect(problems).toEqual([]);
    const [scene] = document.scenes;
    expect(scene).toMatchObject({
      id: 'root',
      dim: '2d',
      theme: 'flat',
      camera: { center: { x: 200, y: 0 }, zoom: 1 },
    });
    expect(scene.elements.a).toMatchObject({
      kind: 'rect',
      label: 'A',
      center: { x: 0, y: 0 },
      size: { width: 100, height: 60 },
      style: { surface: 'solid', border: true, rounded: true },
    });
    expect(scene.elements.ab).toMatchObject({
      kind: 'link',
      from: { element: 'a' },
      to: { element: 'b' },
      props: { end: 'arrow' },
    });
  });

  test('parses a 3D point and a WxHxD scale', () => {
    const { document, problems } = readScenes(`scene s dim=3d {
  camera target=0,0,0 yaw=-45 pitch=30 distance=14 fov=0.8 projection=perspective
  element c cube @ 1,2,3 scale=2x1x0.5 rotation=0,45,0
}
`);
    expect(problems).toEqual([]);
    expect(document.scenes[0].elements.c).toMatchObject({
      position: { x: 1, y: 2, z: 3 },
      scale: { x: 2, y: 1, z: 0.5 },
      rotation: { x: 0, y: 45, z: 0 },
    });
  });

  test('an id called scene still parses in an object statement', () => {
    const { problems } = parse('object scene {\n  rect element 0,0 10x10\n}\n');
    expect(problems).toEqual([]);
  });

  test('reports a link to a missing element', () => {
    const { problems } = readScenes(`scene s dim=2d {
  camera center=0,0 zoom=1
  element ab link from=a to=b
}
`);
    expect(problems.map((problem) => problem.message).join()).toContain('"a"');
  });
});
