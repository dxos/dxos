//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import { useEffect } from 'react';

import { useResize } from './useResize';

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
    const onUpdate = () => callback({ layout, grid, data });
    layout.on('update', onUpdate);
    return () => {
      layout.reset();
      layout.off('update', onUpdate);
    };
  }, [layout]);

  //
  // Update on resize (throttled).
  //
  const { size } = grid;
  useResize(() => {
    layout.update(grid, data);
  }, size);

  //
  // Update on external data change.
  //
  useEffect(() => {
    layout.update(grid, data);
  }, [data, ...deps]);

  //
  // Clean-up.
  //
  useEffect(() => {
    return () => {
      layout.reset();
    };
  }, []);
};
