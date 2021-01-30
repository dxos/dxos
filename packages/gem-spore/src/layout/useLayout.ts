//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import { useEffect } from 'react';
import { throttle } from 'throttle-debounce';

import { GridProperties } from '@dxos/gem-core';

import { Layout } from './layout';
import { useResizeListener } from './useResizeListener';

/**
 * Creates an active layout.
 *
 * @param {Object} layout
 * @param {Object} grid
 * @param {Object} data
 * @param {function} render
 * @param [deps] - Additional dependencies to trigger update.
 */
export const useLayout = (layout: Layout, grid: GridProperties, data = {}, render: Function, deps = []) => {
  assert(layout);
  assert(grid);
  assert(data);
  assert(render);

  //
  // Update events.
  //
  useEffect(() => {
    // TODO(burdon): Throttle delay?
    const handleUpdate = throttle(5, true, () => {
      render({ grid, layout, data });
    });

    layout.on('update', handleUpdate);
    layout.reset();
    layout.update(grid, data);

    return () => {
      layout.off('update', handleUpdate);
      layout.reset();
    };
  }, [layout]);

  //
  // Update on resize (throttled).
  //
  const { size } = grid;
  useResizeListener(() => {
    layout.update(grid, data);
  }, size);

  //
  // Update on external data change.
  //
  useEffect(() => {
    layout.update(grid, data);
  }, [data, ...deps]);
};
