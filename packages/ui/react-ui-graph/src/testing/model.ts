//
// Copyright 2022 DXOS.org
//

import { type Graph, GraphModel } from '@dxos/graph';
import { faker } from '@dxos/random';

import { createEdge, createNode } from './data';

export type TestNode = Graph.Node & {
  label?: string;
  children?: TestNode[];
};

export class TestGraphModel extends GraphModel.ReactiveGraphModel<TestNode> {
  getRandomNode() {
    return faker.helpers.arrayElement(this._graph.nodes);
  }

  createNodes(node: TestNode = undefined, n = 1): void {
    Array.from({ length: n }).forEach(() => {
      const child = this.addNode(createNode());
      const parent = node || faker.helpers.arrayElement(this._graph.nodes);
      if (parent) {
        this.addEdge(createEdge(parent, child));
      }
    });
  }
}
