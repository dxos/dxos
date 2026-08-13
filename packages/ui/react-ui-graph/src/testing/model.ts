//
// Copyright 2022 DXOS.org
//

import { GraphModel, Node } from '@dxos/graph';
import { random } from '@dxos/random';

import { createEdge, createNode } from './data';

export type TestNode = Node.Any & {
  label?: string;
  children?: TestNode[];
};

export class TestGraphModel extends GraphModel.GraphModel<TestNode> {
  getRandomNode() {
    return random.helpers.arrayElement(this.nodes);
  }

  createNodes(node: TestNode = undefined, n = 1): void {
    Array.from({ length: n }).forEach(() => {
      const child = this.addNode(createNode());
      const parent = node || random.helpers.arrayElement(this.nodes);
      if (parent) {
        this.addEdge(createEdge(parent, child));
      }
    });
  }
}
