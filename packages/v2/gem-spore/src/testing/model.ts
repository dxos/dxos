//
// Copyright 2022 DXOS.org
//

import faker from 'faker';

import { EventEmitter } from '@dxos/gem-core';

import { emptyGraph, GraphData, GraphModel } from '../graph';
import { createLink, createNode } from './data';
import { TestNode } from './types';

/**
 * Test graph.
 */
export class TestGraphModel implements GraphModel<TestNode> {
  public readonly updated = new EventEmitter<GraphData<TestNode>>();

  constructor (
    private readonly _graph: GraphData<TestNode> = emptyGraph
  ) {}

  get graph () {
    return this._graph;
  }

  getNode (id: string) {
    return this._graph.nodes.find(item => item.id === id);
  }

  getRandomNode () {
    return faker.random.arrayElement(this._graph.nodes);
  }

  subscribe (callback: (graph: GraphData<TestNode>) => void) {
    return this.updated.on(callback);
  }

  clear () {
    this._graph.nodes = [];
    this._graph.links = [];
    this.update();
  }

  createNodes (node: TestNode = undefined, n: number = 1, update = true) {
    Array.from({ length: n }).map(() => {
      const child = createNode();
      const parent = node || faker.random.arrayElement(this._graph.nodes);
      this._graph.nodes.push(child);
      if (parent) {
        const link = createLink(parent, child);
        this._graph.links.push(link);
      }
    });

    update && this.update();
  }

  deleteNode (node: string, update = true) {
    this._graph.nodes = this._graph.nodes.filter(({ id }) => id !== node);
    this._graph.links = this._graph.links.filter(({ source, target }) => source !== node && target !== node);

    update && this.update();
  }

  createLink (source: TestNode, target: TestNode, update = true) {
    this._graph.links.push(createLink(source, target));

    update && this.update();
  }

  deleteLink (link: string, update = true) {
    this._graph.links = this._graph.links.filter(({ id }) => id !== link);

    update && this.update();
  }

  update () {
    this.updated.emit(this._graph);
  }
}
