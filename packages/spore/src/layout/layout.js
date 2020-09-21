//
// Copyright 2020 DXOS.org
//

import EventEmitter from 'events';
import defaultsDeep from 'lodash.defaultsdeep';

/**
 * Base class for layouts.
 */
export class Layout extends EventEmitter {

  _data = {
    guides: []
  };

  constructor (options = undefined) {
    super();

    this._options = defaultsDeep({}, options, this.defaults, {
      center: grid => grid.center,
      radius: grid => Math.min(grid.size.width, grid.size.height) * .25
    });
  }

  get defaults () {
    return {};
  }

  get data () {
    return this._data;
  }

  reset () {
    this._onReset();
  }

  // Call to notify repaint.
  emitUpdate () {
    this.emit('update', this);
  }

  update (grid, data) {
    if (grid.size.width !== null && grid.size.height !== null) {
      this._onUpdate(grid, data);
      this.emitUpdate();
    }
  }

  _onReset () {}

  /**
   * Compute the layout.
   * @param grid
   * @param data
   * @private
   */
  // eslint-disable-next-line no-unused-vars
  _onUpdate (grid, data) {}
}
