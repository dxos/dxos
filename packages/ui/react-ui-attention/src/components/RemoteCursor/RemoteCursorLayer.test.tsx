//
// Copyright 2026 DXOS.org
//

import { cleanup, fireEvent, render } from '@testing-library/react';
import React, { useMemo } from 'react';
import { afterEach, describe, test, vi } from 'vitest';

import { type CursorProjection, RemoteCursorLayer } from './RemoteCursorLayer.tsx';

// The surface is drawn at twice its own units.
const projection: CursorProjection = {
  fromLayer: ({ x, y }) => ({ x: x / 2, y: y / 2 }),
  toLayer: ({ x, y }) => ({ x: x * 2, y: y * 2 }),
};

describe('RemoteCursorLayer', () => {
  afterEach(cleanup);

  test('reports the local pointer in surface coordinates and clears it on leave', ({ expect }) => {
    const onPointerChange = vi.fn();
    const { getByTestId } = render(
      <div data-testid='surface'>
        <RemoteCursorLayer cursors={[]} projection={projection} onPointerChange={onPointerChange} />
      </div>,
    );
    const root = getByTestId('surface');
    fireEvent.pointerMove(root, { clientX: 40, clientY: 20 });
    expect(onPointerChange).toHaveBeenLastCalledWith({ x: 20, y: 10 });
    fireEvent.pointerLeave(root);
    expect(onPointerChange).toHaveBeenLastCalledWith(undefined);
  });

  test('places remote cursors through the projection', ({ expect }) => {
    const { getByTestId } = render(
      <div>
        <RemoteCursorLayer cursors={[{ id: 'a', name: 'Alice', hue: 'red', x: 5, y: 7 }]} projection={projection} />
      </div>,
    );
    const cursor = getByTestId('remote-cursor');
    expect(cursor.style.transform).toContain('translate(10px, 14px)');
    expect(cursor.textContent).toBe('Alice');
  });

  test('places cursors again from the committed surface when the projection changes', ({ expect }) => {
    // Like an svg's viewBox, the scale reaches the DOM only when React commits the render that changes it.
    const Surface = ({ scale }: { scale: number }) => {
      const scaled = useMemo<CursorProjection>(
        () => ({
          fromLayer: (point) => point,
          toLayer: ({ x, y }, layer) => {
            const committed = Number(layer.parentElement?.dataset.scale);
            return { x: x * committed, y: y * committed };
          },
        }),
        [scale],
      );
      return (
        <div data-scale={scale}>
          <RemoteCursorLayer cursors={[{ id: 'a', name: 'Alice', hue: 'red', x: 5, y: 7 }]} projection={scaled} />
        </div>
      );
    };
    const { getByTestId, rerender } = render(<Surface scale={1} />);
    expect(getByTestId('remote-cursor').style.transform).toContain('translate(5px, 7px)');
    rerender(<Surface scale={3} />);
    expect(getByTestId('remote-cursor').style.transform).toContain('translate(15px, 21px)');
  });
});
