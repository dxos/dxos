//
// Copyright 2020 DxOS
//

import EventEmitter from 'events';
import defaultsDeep from 'lodash.defaultsdeep';

/**
 * Base class for layouts.
 */
export class Layout extends EventEmitter {

  constructor(options = {}) {
    super();

    this._options = defaultsDeep({}, options, this.defaults, {
      center: grid => grid.center,
      radius: grid => Math.min(grid.size.width, grid.size.height) * .25
    });
  }

  get defaults() {
    return {};
  }

  emitUpdate(data) {
    // TODO(burdon): Separate layout from data.
    this.emit('update', data);
  }

  // TODO(burdon): Data structure for guides (e.g., radius circle).

  reset() {
    this._onReset();
  }

  update(grid, data) {
    if (grid.size.width !== null && grid.size.height !== null) {
      this._onUpdate(grid, data);
      this.emitUpdate(data);
    }
  }

  _onReset() {}

  /**
   * Compute the layout.
   * @param grid
   * @param data
   * @private
   */
  // eslint-disable-next-line no-unused-vars
  _onUpdate(grid, data) {}
}
