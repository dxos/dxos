//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Dsl } from '@dxos/diagram';
import { EXEMPLARS } from '@dxos/diagram/testing';
import { toCanvasViews } from '@dxos/react-ui-scene/canvas';
import { type Scene, copyElements } from '@dxos/scene';

import { canvasClipboardFrom, canvasClipboardText, fragmentText, readFragment } from './clipboard-text.ts';

const linksDoc = () => Dsl.readScenes(EXEMPLARS.links).document;
const cubeLayout: Scene.LayoutRecord3D = {
  id: 'cube',
  dim: '3d',
  elements: { box: { id: 'box', kind: 'cube', center: { x: 1, y: 1, z: 0 }, style: { hue: 'red' } } },
};

describe('clipboard text', () => {
  test('a 3D fragment prints as .dx text and reads back as the same elements', () => {
    const doc: Scene.SceneDocument = { scenes: [], layouts: [cubeLayout], models: [] };
    const text = fragmentText(doc, cubeLayout, copyElements(cubeLayout, ['box']));
    expect(text).toContain('layout');
    expect(readFragment(text, '3d')?.elements.box).toMatchObject({ kind: 'cube', center: { x: 1, y: 1, z: 0 } });
  });

  test('a 2D fragment of elements placing model objects reads back whole, with no object left to resolve', () => {
    const doc = linksDoc();
    const layout = doc.layouts[0];
    const text = fragmentText(doc, layout, copyElements(layout, Object.keys(layout.elements)));
    const read = readFragment(text, '2d');
    expect(read && Object.keys(read.elements).sort()).toEqual(Object.keys(layout.elements).sort());
    expect(Object.values(read?.elements ?? {}).every((element) => element.object === undefined)).toBe(true);
  });

  test('2D text pasted into 3D is lifted onto the ground; 3D text pasted into 2D is flattened', () => {
    const doc: Scene.SceneDocument = { scenes: [], layouts: [cubeLayout], models: [] };
    const text3D = fragmentText(doc, cubeLayout, copyElements(cubeLayout, ['box']));
    expect(readFragment(text3D, '2d')?.elements.box).toMatchObject({ kind: 'rect', center: { x: 100, y: 0 } });
    const flat = readFragment(text3D, '2d');
    const text2D = flat && fragmentText({ scenes: [], layouts: [flat], models: [] }, flat, flat);
    expect(text2D && readFragment(text2D, '3d')?.elements.box).toMatchObject({ kind: 'cube', center: { x: 1, z: 0 } });
  });

  test('text that is not a scene reads as nothing', () => {
    expect(readFragment('hello world', '3d')).toBeUndefined();
  });

  test("the 2D canvas's clipboard prints as .dx text and reads back as the same nodes and links", () => {
    const [view] = toCanvasViews(linksDoc()).views;
    const text = canvasClipboardText({ nodes: Object.values(view.nodes), links: Object.values(view.links) });
    const back = canvasClipboardFrom(text);
    expect(back?.nodes.map((node) => node.id).sort()).toEqual(Object.keys(view.nodes).sort());
    expect(back?.links.map((link) => link.id).sort()).toEqual(Object.keys(view.links).sort());
  });

  test('3D text pasted into the 2D canvas arrives as flattened nodes', () => {
    const doc: Scene.SceneDocument = { scenes: [], layouts: [cubeLayout], models: [] };
    const back = canvasClipboardFrom(fragmentText(doc, cubeLayout, copyElements(cubeLayout, ['box'])));
    expect(back?.nodes).toEqual([expect.objectContaining({ id: 'box', type: 'rect', center: { x: 100, y: 0 } })]);
  });
});
