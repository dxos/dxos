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
 * @param {function} [onUpdate]
 * @param [deps]
 */
export const useLayout = (layout, grid, data = {}, onUpdate, deps = []) => {
  assert(layout);
  assert(grid);
  assert(data);

  // Update events.
  useEffect(() => {
    layout.on('update', onUpdate);
    return () => {
      layout.off('update', onUpdate);
    };
  }, [layout, onUpdate]);

  // Update data.
  useEffect(() => {
    layout.update(grid, data);
  }, [data, ...deps]);

  // Update on resize (throttled).
  const { size } = grid;
  useResize(() => {
    layout.update(grid, data);
  }, size);

  // Clean-up.
  useEffect(() => {
    return () => {
      layout.reset();
    };
  }, []);
};
