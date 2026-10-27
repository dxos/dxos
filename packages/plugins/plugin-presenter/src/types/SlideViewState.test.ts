//
// Copyright 2026 DXOS.org
//

import * as Registry from 'effect/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import { ViewState, createDefaultBackends } from '@dxos/react-ui-attention/types';

import * as SlideViewState from './SlideViewState.ts';

const makeManager = () => {
  const registry = Registry.make();
  return new ViewState.Manager({ registry, backends: createDefaultBackends(registry) });
};

describe('SlideViewState.aspect', () => {
  test('declares a local aspect seeded to the first slide', ({ expect }) => {
    expect(SlideViewState.aspect.key).toEqual('presenter-slide');
    expect(SlideViewState.aspect.backend).toEqual('local');
    expect(SlideViewState.aspect.defaultValue()).toEqual({ index: 0 });
  });

  test('round-trips an index per context id', ({ expect }) => {
    const manager = makeManager();
    expect(manager.get(SlideViewState.aspect, 'a')).toEqual({ index: 0 });
    manager.set(SlideViewState.aspect, 'a', { index: 3 });
    expect(manager.get(SlideViewState.aspect, 'a')).toEqual({ index: 3 });
    expect(manager.get(SlideViewState.aspect, 'b')).toEqual({ index: 0 });
  });
});

describe('SlideViewState.clamp', () => {
  test('bounds the index to the slide count', ({ expect }) => {
    expect(SlideViewState.clamp(7, 3)).toEqual(2);
    expect(SlideViewState.clamp(-1, 3)).toEqual(0);
    expect(SlideViewState.clamp(1, 3)).toEqual(1);
    expect(SlideViewState.clamp(5, 0)).toEqual(0);
  });
});
