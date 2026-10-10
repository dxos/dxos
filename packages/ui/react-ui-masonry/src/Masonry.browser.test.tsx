//
// Copyright 2026 DXOS.org
//

import React, { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';
import { afterEach, describe, test } from 'vitest';

import { Masonry } from './Masonry.tsx';
import { ESTIMATED_TILE_HEIGHT } from './useMasonryLayout.ts';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const TILE_HEIGHT = 50;

const Tile = ({ data }: { data: string }) => <div style={{ height: TILE_HEIGHT }}>{data}</div>;

const items = ['a', 'b', 'c', 'd'];

let root: Root | undefined;
let container: HTMLElement | undefined;

const mount = (cacheKey?: string) => {
  container = document.createElement('div');
  container.style.width = '800px';
  document.body.appendChild(container);
  const reactRoot = createRoot(container);
  root = reactRoot;
  act(() =>
    reactRoot.render(
      <Masonry.Root Tile={Tile}>
        <Masonry.Content padding={false} scrollbars={false}>
          <Masonry.Viewport items={items} getId={(item: string) => item} cacheKey={cacheKey} />
        </Masonry.Content>
      </Masonry.Root>,
    ),
  );
  const grid = container.querySelector<HTMLElement>('[role="list"]');
  if (!grid) {
    throw new Error('Masonry rendered no grid in its first commit');
  }
  return grid;
};

const unmount = () => {
  act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
};

afterEach(unmount);

describe('Masonry', () => {
  test('lays out at its measured height in the first commit', ({ expect }) => {
    const grid = mount();

    expect(grid.offsetHeight).toBeGreaterThanOrEqual(2 * TILE_HEIGHT);
    expect(grid.offsetHeight).toBeLessThan(ESTIMATED_TILE_HEIGHT);
  });

  test('reveals at once only when every height was cached by an earlier mount', ({ expect }) => {
    const cold = mount('masonry-reveal');
    expect(cold.style.visibility).toBe('hidden');
    unmount();

    const warm = mount('masonry-reveal');
    expect(warm.style.visibility).toBe('visible');
  });
});
