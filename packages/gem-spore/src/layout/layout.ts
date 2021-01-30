//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import EventEmitter from 'events';
import defaultsDeep from 'lodash.defaultsdeep';

import { Graph, GridProperties } from '@dxos/gem-core';

/**
 * Base class for layouts.
 */
export abstract class Layout extends EventEmitter {
  // TODO(burdon): Define structure.
  _data = {
    guides: [],
    nodes: [],
    links: []
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
   */
  // TODO(burdon): Define common data structure for all layouts?
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _onUpdate (grid: GridProperties, data: Graph) {}

  /**
   * Update data.
   */
  _setData (data: Graph) {
    const find = id => {
      assert(typeof id === 'string');
      const node = data.nodes.find(n => n.id === id);
      assert(node, 'missing node: ' + id);
      return node;
    };

    Object.assign(this._data, {
      nodes: data.nodes,
      links: data.links.map(({ id, source, target }) => ({
        id,
        source: find(source),
        target: find(target)
      }))
    });
  }
}
