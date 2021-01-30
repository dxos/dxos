//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import EventEmitter from 'events';
import defaultsDeep from 'lodash.defaultsdeep';

/**
 * Base class for layouts.
 */
export class Layout extends EventEmitter {
  _data = {
    guides: []
  };

  _options: any;

  constructor (options = undefined) {
    super();

    this._options = defaultsDeep({}, options, this.defaults, {
      center: grid => grid.center,
      radius: grid => Math.min(grid.size.width, grid.size.height) * 0.25
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
  _onUpdate (grid, data) {}

  _setData (data) {
    const find = id => {
      assert(typeof id === 'string');
      const node = data.nodes.find(n => n.id === id);
      assert(node, 'missing node: ' + id);
      return node;
    };

    Object.assign(this.data, {
      nodes: data.nodes,
      links: data.links.map(({ id, source, target }) => ({
        id,
        source: find(source),
        target: find(target)
      }))
    });
  }
}
