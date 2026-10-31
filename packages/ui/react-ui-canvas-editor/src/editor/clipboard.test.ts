//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Dsl } from '@dxos/diagram';
import { type Scene } from '@dxos/scene';

import { type SceneClipboard, copyFragment, nextPaste, pasteInto } from './clipboard.ts';
import { type ClipboardCodec } from './config.ts';

/** `.dx` text in one dimension only; the plugin's codec lifts and flattens across them. */
const codec: ClipboardCodec = {
  write: (_document, _layout, fragment) => Dsl.printScenes({ scenes: [], layouts: [fragment], models: [] }),
  read: (text, dim) => {
    try {
      const layout = Dsl.readScenes(text).document.layouts[0];
      return layout?.dim === dim ? layout : undefined;
    } catch {
      return undefined;
    }
  },
};

const fragment: Scene.LayoutRecord3D = {
  id: 'clipboard',
  dim: '3d',
  elements: { box: { id: 'box', type: 'cube', center: { x: 0, y: 1, z: 0 } } },
};
const copied: SceneClipboard = { fragment, text: 'layout clipboard dim=3d {}', pasted: 0 };

const document: Scene.SceneDocument = {
  scenes: [
    {
      id: 's',
      dim: '3d',
      layout: 'root',
      camera: { target: { x: 0, y: 0, z: 0 }, yaw: 0, pitch: 30, distance: 10, fov: 0.8, projection: 'perspective' },
    },
  ],
  layouts: [
    { id: 'root', dim: '3d', elements: { 'box-1': { id: 'box-1', type: 'cube', center: { x: 0, y: 0, z: 0 } } } },
  ],
  models: [],
};

describe('nextPaste', () => {
  test('pasting what this canvas copied lands one step further each time', () => {
    const first = nextPaste(copied, copied.text, '3d', codec);
    expect(first?.pasted).toBe(1);
    const second = first && nextPaste(first, first.text, '3d', codec);
    expect(second?.pasted).toBe(2);
  });

  test('text from elsewhere replaces the copy, read in the dimension it is pasted into', () => {
    const other = 'layout l dim=3d {\n  element c cube @ 1,0,0\n}';
    const next = nextPaste(copied, other, '3d', codec);
    expect(next?.text).toBe(other);
    expect(next?.pasted).toBe(1);
  });

  test('with nothing on the system clipboard, the copy pastes', () => {
    expect(nextPaste(copied, undefined, '3d', codec)?.pasted).toBe(1);
  });

  test('nothing copied and no scene text: nothing pastes', () => {
    expect(nextPaste(undefined, 'hello', '3d', codec)).toBeUndefined();
  });
});

describe('copyFragment and pasteInto', () => {
  test('a copied selection pastes back offset by the step, with fresh ids', () => {
    const copy = copyFragment(codec, document, 'root', ['box-1']);
    expect(copy?.text).toContain('cube');
    const result = pasteInto({
      codec,
      document,
      layout: 'root',
      copied: copy,
      text: copy?.text,
      offset: (pasted) => ({ x: pasted, y: 0, z: pasted }),
    });
    expect(result.kind).toBe('paste');
    if (result.kind === 'paste') {
      expect(result.ids).toEqual(['cube-1']);
      expect(result.clipboard.pasted).toBe(1);
    }
  });

  test('nothing selected copies nothing; nothing copied pastes nothing', () => {
    expect(copyFragment(codec, document, 'root', [])).toBeUndefined();
    expect(
      pasteInto({ codec, document, layout: 'root', copied: undefined, text: undefined, offset: () => ({ x: 0, y: 0 }) })
        .kind,
    ).toBe('empty');
  });
});
