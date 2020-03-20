//
// Copyright 2018 DxOS
//

import { Chance } from 'chance';
import filter from 'lodash.filter';
import find from 'lodash.find';
import indexOf from 'lodash.indexof';
import times from 'lodash.times';

/**
 * Test data.
 */
export class GraphGenerator {

  // TODO(burdon): Config.
  static _chance = new Chance(0);

  static createId() {
    return GraphGenerator._chance.guid();
  }

  static _createNodes(n = 1) {
    return times(n, i => {
      return {
        id: GraphGenerator.createId(),
        label: GraphGenerator._chance.word()
      };
    });
  }

  _data = {
    nodes: [],
    links: []
  };

  get data() {
    return this._data;
  }

  /**
   * Pick unique nodes.
   */
  pickNodes(n = 1, exclude = []) {
    let remaining = filter(this._data.nodes, n => indexOf(exclude, n) === -1);
    n = Math.min(remaining.length, n);

    return times(n, i => {
      let node = GraphGenerator._chance.pickone(remaining);
      exclude.push(node);
      return node;
    });
  }

  /**
   * Create single node.
   */
  createNode() {
    let node = GraphGenerator._createNodes(1)[0];
    this._data.nodes.push(node);

    return node;
  }

  /**
   * Create nodes.
   */
  createNodes(n = 1) {
    this._data.nodes = this._data.nodes.concat(GraphGenerator._createNodes(n));

    return this;
  }

  /**
   * Delete nodes and related links.
   * @param ids
   */
  deleteNodes(ids) {
    this._data.nodes = filter(this._data.nodes, ({ id }) => ids.indexOf(id) === -1);
    this._data.links = filter(this._data.links,
      ({ source, target }) => ids.indexOf(source.id) === -1 && ids.indexOf(target.id) === -1);

    return this;
  }

  /**
   * Create the specified link.
   * @param sourceId
   * @param targetId
   */
  createLink(sourceId, targetId) {
    let source = find(this._data.nodes, { id: sourceId });
    let target = find(this._data.nodes, { id: targetId });
    if (source && target) {
      this._data.links.push({
        id: GraphGenerator.createId(),
        source: source,
        target: target
      });
    }

    return this;
  }

  /**
   * Create links.
   */
  createLinks(n = 1) {
    if (this._data.nodes.length < 2) {
      return this;
    }

    times(n, i => {
      let [source, target] = this.pickNodes(2);

      if (source.id !== target.id) {
        this._data.links.push({
          id: GraphGenerator.createId(),
          source: source,
          target: target
        });
      }
    });

    return this;
  }

  /**
   * Create separate trees.
   */
  createTrees(n = 1, maxDepth = 1) {
    times(n, i => {
      this.createTree(GraphGenerator._chance.integer({ min: 1, max: maxDepth }));
    });

    return this;
  }

  /**
   * Create tree.
   */
  createTree(depth = 1, root) {
    if (!root) {
      root = this.createNode();
    }

    // TODO(burdon): Check not cyclic.
    let targets = GraphGenerator._createNodes(GraphGenerator._chance.integer({ min: 1, max: 5 }));
    this._data.nodes = this._data.nodes.concat(...targets);

    targets.forEach(target => {
      this._data.links.push({
        id: GraphGenerator.createId(),
        source: root,
        target
      });

      // TODO(burdon): Set position relative to parent.
      // Object.assign(target, { x: root.x, y: root.y });

      if (depth > 1) {
        this.createTree(depth - 1, target);
      }
    });

    return this;
  }
}
