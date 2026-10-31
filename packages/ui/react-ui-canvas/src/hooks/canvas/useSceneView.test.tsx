//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import { renderHook } from '@testing-library/react';
import * as Registry from 'effect/reactivity/AtomRegistry';
import React, { type PropsWithChildren, useRef } from 'react';
import { afterEach, beforeEach, describe, test, vi } from 'vitest';

import { type Size } from '@dxos/scene';

import { createCanvasAtoms } from '../../engine/index.ts';
import { fitBounds } from '../../utils/index.ts';
import { useSceneView } from './useSceneView.ts';

const TARGET = { x: -128, y: -64, width: 768, height: 320 };
const INSET = 32;

const setup = () => {
  const registry = Registry.make();
  const atoms = createCanvasAtoms('root');
  const setCamera = vi.fn();
  const animateTo = vi.fn();
  const wrapper = ({ children }: PropsWithChildren) => (
    <RegistryContext.Provider value={registry}>{children}</RegistryContext.Provider>
  );
  const hook = renderHook(
    ({ viewport }: { viewport: Size }) =>
      useSceneView({
        registry,
        atoms,
        rootRef: useRef(null),
        viewport,
        interactedRef: useRef(false),
        path: ['root'],
        camera: { x: 0, y: 0, zoom: 1 },
        drag: undefined,
        fitTarget: TARGET,
        inset: INSET,
        setCamera,
        animateTo,
        isAnimating: () => false,
      }),
    { wrapper, initialProps: { viewport: { width: 1024, height: 768 } } },
  );
  return { ...hook, setCamera, animateTo };
};

describe('useSceneView', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('a size change while the view opens (a docked panel mounting) refits at once, without animating', ({
    expect,
  }) => {
    const { rerender, setCamera, animateTo } = setup();
    expect(setCamera).toHaveBeenLastCalledWith(fitBounds(TARGET, { width: 1024, height: 768 }, INSET, 1));
    rerender({ viewport: { width: 704, height: 768 } });
    expect(setCamera).toHaveBeenLastCalledWith(fitBounds(TARGET, { width: 704, height: 768 }, INSET, 1));
    vi.advanceTimersByTime(1000);
    expect(animateTo).not.toHaveBeenCalled();
  });

  test('once the view has settled, a resize animates to the new fit after the debounce', ({ expect }) => {
    const { rerender, setCamera, animateTo } = setup();
    vi.advanceTimersByTime(1000);
    const calls = setCamera.mock.calls.length;
    rerender({ viewport: { width: 704, height: 768 } });
    expect(setCamera).toHaveBeenCalledTimes(calls);
    vi.advanceTimersByTime(1000);
    expect(animateTo).toHaveBeenLastCalledWith(
      fitBounds(TARGET, { width: 704, height: 768 }, INSET, 1),
      undefined,
      undefined,
    );
  });
});
