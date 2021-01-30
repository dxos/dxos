//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import { useEffect } from 'react';

import { useResizeListener } from './useResizeListener';

/**
 * Creates an active layout.
 *
 * @param {Object} layout
 * @param {Object} grid
 * @param {Object} data
 * @param {function} callback
 * @param [deps] - Additional dependencies to trigger update.
 */
export const useLayout = (layout, grid, data = {}, callback, deps = []) => {
  assert(layout);
  assert(grid);
  assert(data);
  assert(callback);

  //
  // Update events.
  //
  useEffect(() => {
    const onUpdate = () => {
      callback({ grid, layout, data });
    };

    layout.on('update', onUpdate);
    layout.reset();
    layout.update(grid, data);

    return () => {
      layout.off('update', onUpdate);
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
