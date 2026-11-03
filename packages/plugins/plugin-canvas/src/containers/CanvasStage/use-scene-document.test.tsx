//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { act, renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import { Dsl } from '@dxos/diagram';
import { EXEMPLARS } from '@dxos/diagram/testing';
import { Obj } from '@dxos/echo';
import { toEcho } from '@dxos/scene';

import { useSceneDocument } from './use-scene-document.ts';

describe('useSceneDocument', () => {
  test("follows edits to the stored scene's layout", () => {
    const { root, layouts } = toEcho(Dsl.readScenes(EXEMPLARS.links).document);
    const layout = layouts.get('links');
    const { result } = renderHook(() => useSceneDocument(root));
    const label = () => result.current?.layouts[0]?.elements.a?.label;
    expect(label()).toBe('A');
    act(() => {
      layout &&
        Obj.update(layout, (layout) => {
          layout.elements.a.label = 'Alpha';
        });
    });
    expect(label()).toBe('Alpha');
  });

  test('follows edits to the stored scene', () => {
    const { root } = toEcho(Dsl.readScenes(EXEMPLARS.links).document);
    const { result } = renderHook(() => useSceneDocument(root));
    act(() => {
      Obj.update(root, (root) => {
        root.name = 'Renamed';
      });
    });
    expect(result.current?.scenes[0].name).toBe('Renamed');
  });

  test("follows edits to a composite object's parts layout", () => {
    const { root, layouts } = toEcho(Dsl.readScenes(EXEMPLARS.subscene).document);
    const detail = layouts.get('b-detail');
    const { result } = renderHook(() => useSceneDocument(root));
    const label = () => result.current?.layouts.find((layout) => layout.id === 'b-detail')?.elements.x?.label;
    expect(label()).toBe('X');
    act(() => {
      detail &&
        Obj.update(detail, (detail) => {
          detail.elements.x.label = 'Changed';
        });
    });
    expect(label()).toBe('Changed');
  });
});
