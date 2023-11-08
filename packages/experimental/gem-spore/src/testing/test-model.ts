//
// Copyright 2022 DXOS.org
//

import { faker } from '@faker-js/faker';

import { createLink, createNode } from './data';
import { type TestNode } from './types';
import { emptyGraph, type GraphData, GraphModel } from '../graph';

/**
 * Test graph.
 */
export class TestGraphModel extends GraphModel<TestNode> {
  constructor(private readonly _graph: GraphData<TestNode> = emptyGraph) {
    super();
  }

  get graph() {
    return this._graph;
  }

  getNode(id: string) {
    return this._graph.nodes.find((node) => node.id === id);
  }

  getRandomNode() {
    return faker.helpers.arrayElement(this._graph.nodes);
  }

  clear() {
    this._graph.nodes = [];
    this._graph.links = [];
    this.triggerUpdate();
  }

  createNodes(node: TestNode = undefined, n = 1, update = true) {
    Array.from({ length: n }).forEach(() => {
      const child = createNode();
      const parent = node || faker.helpers.arrayElement(this._graph.nodes);
      this._graph.nodes.push(child);
      if (parent) {
        const link = createLink(parent, child);
        this._graph.links.push(link);
      }
    });

    update && this.triggerUpdate();
  }

  deleteNode(node: string, update = true) {
    this._graph.nodes = this._graph.nodes.filter(({ id }) => id !== node);
    this._graph.links = this._graph.links.filter(({ source, target }) => source !== node && target !== node);
    update && this.triggerUpdate();
  }

  createLink(source: TestNode, target: TestNode, update = true) {
    this._graph.links.push(createLink(source, target));
    update && this.triggerUpdate();
  }

  deleteLink(link: string, update = true) {
    this._graph.links = this._graph.links.filter(({ id }) => id !== link);
    update && this.triggerUpdate();
  }
}
