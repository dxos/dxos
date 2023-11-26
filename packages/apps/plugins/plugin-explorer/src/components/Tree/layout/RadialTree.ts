//
// Copyright 2023 DXOS.org
// Copyright 2022 Observable, Inc.
//

import * as d3 from 'd3';

import { type TreeOptions } from '../Tree';

// Released under the ISC license.
// https://observablehq.com/@d3/radial-tree
// https://observablehq.com/@d3/tree
const RadialTree = (s: SVGSVGElement, data: any, options: TreeOptions) => {
  const svg = d3.select(s);
  svg.selectAll('*').remove();

  const {
    label, // given a node d, returns the display name
    radius = 400,
    r = 4, // radius of nodes
    slots,
  } = options;

  const arc = 2 * Math.PI;

  const root = d3.hierarchy(data);

  // Sort the nodes.
  // if (sort) {
  //   root.sort(sort);
  // }

  // Compute labels and titles.
  const descendants = root.descendants();
  const getLabel = label === null ? null : descendants.map((d) => label(d.data));

  // Compute the layout.
  const layout = d3
    .tree()
    .size([arc, radius])
    .separation((a: any, b: any) => (a.parent === b.parent ? 1 : 2) / a.depth);
  layout(root);

  // Links.
  svg
    .append('g')
    .selectAll('path')
    .data(root.links())
    .join('path')
    .attr('class', slots?.path ?? '')
    .attr(
      'd',
      d3
        .linkRadial()
        .angle((d: any) => d.x + Math.PI / 2)
        .radius((d: any) => d.y) as any,
    );

  // Nodes.
  const node = svg
    .append('g')
    .selectAll('a')
    .data(root.descendants())
    .join('a')
    // .attr('xlink:href', link == null ? null : (d) => link(d.data, d))
    // .attr('target', link == null ? null : linkTarget)
    .attr('transform', (d: any) => `rotate(${(d.x * 180) / Math.PI}) translate(${d.y},0)`);

  node
    .append('circle')
    .attr('class', slots?.node ?? '')
    .attr('r', r);

  // if (title != null) {
  //   node.append('title').text((d) => title(d.data, d));
  // }

  // Text.
  if (getLabel) {
    node
      .append('text')
      .attr('transform', (d: any) => `rotate(${d.x >= Math.PI ? 180 : 0})`)
      .attr('dy', '0.32em')
      // eslint-disable-next-line no-mixed-operators
      .attr('x', (d: any) => (d.x < Math.PI === !d.children ? 6 : -6))
      // eslint-disable-next-line no-mixed-operators
      .attr('text-anchor', (d: any) => (d.x < Math.PI === !d.children ? 'start' : 'end'))
      // .attr('paint-order', 'stroke')
      .attr('class', slots?.text ?? '')
      .text((d, i) => getLabel[i]);
  }

  return svg.node();
};

export default RadialTree;
