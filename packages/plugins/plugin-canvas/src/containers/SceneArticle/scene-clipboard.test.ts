//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type Scene } from '@dxos/scene';

import { type SceneClipboard, nextPaste, pasteOffset } from './scene-clipboard.ts';

const fragment: Scene.LayoutRecord3D = {
  id: 'clipboard',
  dim: '3d',
  elements: { box: { id: 'box', type: 'cube', center: { x: 0, y: 1, z: 0 } } },
};
const copied: SceneClipboard = { fragment, text: 'layout clipboard dim=3d {}', pasted: 0 };

describe('scene clipboard', () => {
  test('pasting what this canvas copied lands one grid step further each time', () => {
    const first = nextPaste(copied, copied.text, '3d');
    expect(first?.pasted).toBe(1);
    const second = first && nextPaste(first, first.text, '3d');
    expect(second?.pasted).toBe(2);
    expect(pasteOffset(2, '3d')).toEqual({ x: 2, y: 0, z: 2 });
  });

  test('text from elsewhere replaces the copy, read in the dimension it is pasted into', () => {
    const other = 'layout l dim=2d {\n  element r rect @ 0,0 size=100x100\n}';
    const next = nextPaste(copied, other, '3d');
    expect(next?.text).toBe(other);
    expect(next?.pasted).toBe(1);
    expect(next?.fragment.dim).toBe('3d');
  });

  test('with nothing on the system clipboard, the copy pastes', () => {
    expect(nextPaste(copied, undefined, '3d')?.pasted).toBe(1);
  });

  test('nothing copied and no scene text: nothing pastes', () => {
    expect(nextPaste(undefined, 'hello', '3d')).toBeUndefined();
  });

  test('a copy from the other dimension pastes converted: 3D flattened into 2D', () => {
    const real: SceneClipboard = {
      fragment,
      text: 'layout clipboard dim=3d {\n  element box cube @ 0,1,0\n}',
      pasted: 0,
    };
    const next = nextPaste(real, undefined, '2d');
    expect(next?.fragment.dim).toBe('2d');
    expect(next?.fragment.elements.box).toMatchObject({ type: 'rect' });
  });
});
