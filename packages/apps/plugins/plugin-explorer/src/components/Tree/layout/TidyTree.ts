//
// Copyright 2023 DXOS.org
// Copyright 2021 Observable, Inc.
//

import * as d3 from 'd3';

import { type TreeOptions } from '../Tree';

// Released under the ISC license.
// https://observablehq.com/@d3/tree
const TidyTree = (s: SVGSVGElement, data: any, options: TreeOptions) => {
  const svg = d3.select(s);
  svg.selectAll('*').remove();

  const { label, width, height, r = 4, padding = 4, margin = 60, slots } = options;

  const root = d3.hierarchy(data);

  // Compute labels and titles.
  const descendants = root.descendants();
  const getLabel = label == null ? null : descendants.map((d) => label(d.data));

  // Compute the layout.
  const dx = 16;
  const dy = width / (root.height + padding);
  const layout = d3.tree().nodeSize([dx, dy]);
  layout(root);

  // Center the tree.
  let x0 = Infinity;
  let x1 = -x0;
  let y0 = Infinity;
  let y1 = -y0;
  root.each((d: any) => {
    if (d.x > x1) {
      x1 = d.x;
    }
    if (d.x < x0) {
      x0 = d.x;
    }
    if (d.y > y1) {
      y1 = d.y;
    }
    if (d.y < y0) {
      y0 = d.y;
    }
  });

  // TODO(burdon): Option to expand.
  // NOTE: x and y are flipped.
  const sx = Math.min(2, Math.max(1, (height - margin * 2) / (x1 - x0)));
  const oy = -(width - (y1 - y0)) / 2;

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
        .link(d3.curveBumpX)
        .x((d: any) => d.y + oy)
        .y((d: any) => d.x * sx) as any,
    );

  // Nodes.
  const node = svg
    .append('g')
    .selectAll('a')
    .data(root.descendants())
    .join('a')
    // .attr('xlink:href', link == null ? null : (d) => link(d.data, d))
    // .attr('target', link == null ? null : linkTarget)
    .attr('transform', (d: any) => `translate(${d.y + oy},${d.x * sx})`);

  node
    .append('circle')
    .attr('class', slots?.node ?? '')
    .attr('r', r);

  // if (title != null) {
  //   node.append('title').text((d) => title(d.data, d));
  // }

  if (getLabel) {
    node
      .append('text')

      .attr('dy', '0.32em')
      .attr('x', (d) => (d.children ? -6 : 6))
      .attr('text-anchor', (d) => (d.children ? 'end' : 'start'))
      // .attr('paint-order', 'stroke')
      .attr('class', slots?.text ?? '')
      .text((d, i) => getLabel[i]);
  }
};

export default TidyTree;
