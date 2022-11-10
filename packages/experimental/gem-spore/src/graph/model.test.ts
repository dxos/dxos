//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';
import faker from 'faker';

import { TestNode } from '../testing';
import { GraphBuilder } from './model';

it('GraphBuilder', function () {
  const model = new GraphBuilder<TestNode>()
    .addNode({ id: faker.datatype.uuid() })
    .addNode({ id: faker.datatype.uuid() })
    .addNode({ id: faker.datatype.uuid() })
    .addNode({ id: faker.datatype.uuid() });

  expect(model.graph.nodes).to.be.lengthOf(4);

  model.createLink(model.getNode(model.graph.nodes[0].id), model.getNode(model.graph.nodes[1].id));
  model.createLink(model.getNode(model.graph.nodes[0].id), model.getNode(model.graph.nodes[2].id));
  model.createLink(model.getNode(model.graph.nodes[2].id), model.getNode(model.graph.nodes[3].id));

  expect(model.graph.links).to.be.lengthOf(3);

  const targetLinks = model.getLinks(model.graph.nodes[0].id, true);
  expect(targetLinks).to.be.lengthOf(2);

  const sourceLinks = model.getLinks(model.graph.nodes[2].id, false, true);
  expect(sourceLinks).to.be.lengthOf(1);

  const allLinks = model.getLinks(model.graph.nodes[2].id, true, true);
  expect(allLinks).to.be.lengthOf(2);
});
