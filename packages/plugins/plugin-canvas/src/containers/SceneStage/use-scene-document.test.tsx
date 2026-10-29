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
  test('follows edits to the stored scene', () => {
    const { root } = toEcho(Dsl.readScenes(EXEMPLARS.links).document);
    const { result } = renderHook(() => useSceneDocument(root));
    const label = () => {
      const scene = result.current?.scenes[0];
      return scene?.dim === '2d' ? scene.elements.a.label : undefined;
    };
    expect(label()).toBe('A');
    act(() => {
      Obj.update(root, (root) => {
        root.elements.a.label = 'Alpha';
      });
    });
    expect(label()).toBe('Alpha');
  });
});
