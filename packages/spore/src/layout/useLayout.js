//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import { useEffect, useState } from 'react';

import { useResize } from './useResize';

/**
 * Creates an active layout.
 *
 * @param {Object} layout
 * @param {Object} grid
 * @param {Object} data
 * @param {function} callback
 * @param [deps]
 */
export const useLayout = (layout, grid, data = {}, callback, deps = []) => {
  assert(layout);
  assert(grid);
  assert(data);
  assert(callback);

  // Used by guides.
  const [context] = useState({});

  //
  // Update events.
  //
  useEffect(() => {
    const onUpdate = data => callback({ context, data });
    layout.on('update', onUpdate);
    return () => {
      layout.off('update', onUpdate);
    };
  }, [layout]);

  //
  // Update on resize (throttled).
  //
  const { size } = grid;
  useResize(() => {
    layout.update(grid, data, context);
  }, size);

  //
  // Update on external data change.
  //
  useEffect(() => {
    layout.update(grid, data, context);
  }, [context, data, ...deps]);

  //
  // Clean-up.
  //
  useEffect(() => {
    return () => {
      layout.reset();
    };
  }, []);
};
