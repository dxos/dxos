//
// Copyright 2022 DXOS.org
//

import faker from 'faker';

import { EventEmitter } from '@dxos/gem-core';

import { GraphData, GraphLink, GraphModel } from '../graph';
import { convertToGraphData, createLink, createNode } from './data';
import { emptyTestGraph, TestGraph, TestNode } from './types';

/**
 * Adapter to convers TestGraphModel to GraphModel used by Graph compoent.
 */
export class TestGraphModelAdapter implements GraphModel<TestNode> {
  constructor (
    private readonly _model: TestGraphModel
  ) {}

  get model () {
    return this._model;
  }

  get graph (): GraphData<TestNode> {
    return convertToGraphData(this._model.graph);
  }

  subscribe (callback: (graph: GraphData<TestNode>) => void): () => void {
    return this._model.updated.on(graph => callback(convertToGraphData(graph)));
  }
}

/**
 * Test graph.
 */
export class TestGraphModel  {
  public readonly updated = new EventEmitter<TestGraph>();

  constructor (
    private readonly _graph: TestGraph = emptyTestGraph
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

  update () {
    this.updated.emit(this._graph);
  }

  createNodes (node: TestNode = undefined, n: number = 1) {
    Array.from({ length: n }).map(() => {
      const child = createNode();
      const parent = node || faker.random.arrayElement(this._graph.nodes);
      const link = createLink(parent, child);
      this._graph.nodes.push(child);
      this._graph.links.push(link);
    });

    this.update();
  }

  createLink (source: TestNode, target: TestNode) {
    this._graph.links.push(createLink(source, target));

    this.update();
  }

  deleteLink (link: GraphLink<TestNode>) {
    this._graph.links = this._graph.links.filter(({ id }) => id !== link.id);

    this.update();
  }
}
