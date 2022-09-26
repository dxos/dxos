//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { Flowchart } from './mermaid';

describe('Code analysis', () => {
  test.only('sanity', () => {
    const flowchart = new Flowchart();

    flowchart
      .addLinkStyle('default', { 'stroke': '#333' })

    flowchart
      .addClassDef('test', { 'fill': 'red' });

    flowchart
      .createSubgraph({ id: 'G1' })
        .addStyle('G1', { 'fill': '#EEE', 'stroke-width': 'none' })
        .createNode({ id: 'A', label: 'Test', className: 'test', href: 'https://dxos.org' })
        .createNode({ id: 'B' })
        .addStyle('B', { 'fill': 'blue', 'stroke-width': '4px' })
        .createSubgraph({ id: 'G2', label: ' ' })
          .createNode({ id: 'C' });

    flowchart
      .createSubgraph({ id: 'G3' })

    flowchart
      .createNode({ id: 'D' });

    flowchart
      .createLink({ source: 'A', target: 'B' })
      .createLink({ source: 'B', target: 'C' })
      .createLink({ source: 'B', target: 'D' });

    const output = flowchart.build();
    console.log(output);
    expect(output).toBeTruthy();
  })
});
