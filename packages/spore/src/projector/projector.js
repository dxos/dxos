//
// Copyright 2020 DxOS, Inc.
//

import EventEmitter from 'events';
import defaultsDeep from 'lodash.defaultsdeep';

/**
 * Base class for projectors.
 */
export class Projector extends EventEmitter {

  constructor(options = {}) {
    super();
    this._options = defaultsDeep({}, options, {
      fade: false
    });

    this.id = Math.random();
  }

  /**
   * On data items updated.
   * @param grid
   * @param data
   * @param options
   */
  // TODO(burdon): Merge or convert to simple function with factory/closure for options?
  update(grid, data, options) {
    this.onData(grid, data, options);
    this.onUpdate(grid, data, options);
  }

  // eslint-disable-next-line no-unused-vars
  onData(grid, data, options) {}

  // eslint-disable-next-line no-unused-vars
  onUpdate(grid, data, options) {}
}
