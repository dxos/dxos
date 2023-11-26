//
// Copyright 2023 DXOS.org
//

import * as d3 from 'd3';

// Copyright 2021 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/tree
const TidyTree = (s: SVGSVGElement, data: any, options: any = {}) => {
  const svg = d3.select(s);
  svg.selectAll('*').remove();

  const {
    // data is either tabular (array of objects) or hierarchy (nested objects)
    path, // as an alternative to id and parentId, returns an array identifier, imputing internal nodes
    id = Array.isArray(data) ? (d: any) => d.id : null, // if tabular data, given a d in data, returns a unique identifier (string)
    parentId = Array.isArray(data) ? (d: any) => d.parentId : null, // if tabular data, given a node d, returns its parent’s identifier
    children, // if hierarchical data, given a d in data, returns its children

    tree = d3.tree, // layout algorithm (typically d3.tree or d3.cluster)
    curve = d3.curveBumpX, // curve for the link
    sort, // how to sort nodes prior to layout (e.g., (a, b) => d3.descending(a.height, b.height))
    label, // given a node d, returns the display name
    title, // given a node d, returns its hover text
    link, // given a node d, its link (if any)
    linkTarget = '_blank', // the target attribute for links (if any)

    width,
    height,
    r = 3, // radius of nodes
    padding = 4, // horizontal padding for first and last column

    fill = '#999', // fill for nodes
    stroke = '#555', // stroke for links
    strokeWidth = 1.5, // stroke width for links
    strokeOpacity = 0.4, // stroke opacity for links
    strokeLinejoin, // stroke line join for links
    strokeLinecap, // stroke line cap for links
    halo = '#fff', // color of label halo
    haloWidth = 3, // padding around the labels
  } = options;

  // If id and parentId options are specified, or the path option, use d3.stratify
  // to convert tabular data to a hierarchy; otherwise we assume that the data is
  // specified as an object {children} with nested objects (a.k.a. the “flare.json”
  // format), and use d3.hierarchy.
  const root =
    path != null
      ? d3.stratify().path(path)(data)
      : id != null || parentId != null
      ? d3.stratify().id(id).parentId(parentId)(data)
      : d3.hierarchy(data, children);

  // Sort the nodes.
  if (sort != null) {
    root.sort(sort);
  }

  // Compute labels and titles.
  const descendants = root.descendants();
  const getLabel = label == null ? null : descendants.map((d) => label(d.data, d));

  // Compute the layout.
  const dx = 8;
  const dy = width / (root.height + padding);
  const layout = tree().nodeSize([dx + 8, dy]);
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

  const ox = -(width - (x1 - x0)) / 2;
  const sy = Math.max(1, height / (y1 - y0 - padding * 2));

  // Use the required curve
  if (typeof curve !== 'function') {
    throw new Error('Unsupported curve');
  }

  // Links.
  svg
    .append('g')
    .attr('fill', 'none')
    .attr('stroke', stroke)
    .attr('stroke-opacity', strokeOpacity)
    .attr('stroke-linecap', strokeLinecap)
    .attr('stroke-linejoin', strokeLinejoin)
    .attr('stroke-width', strokeWidth)
    .selectAll('path')
    .data(root.links())
    .join('path')
    .attr(
      'd',
      d3
        .link(curve)
        .x((d: any) => d.y + ox)
        .y((d: any) => d.x * sy) as any,
    );

  // Nodes.
  const node = svg
    .append('g')
    .selectAll('a')
    .data(root.descendants())
    .join('a')
    // .attr('xlink:href', link == null ? null : (d) => link(d.data, d))
    .attr('target', link == null ? null : linkTarget)
    .attr('transform', (d: any) => `translate(${d.y + ox},${d.x * sy})`);

  node
    .append('circle')
    .attr('fill', (d) => (d.children ? stroke : fill))
    .attr('r', r);

  if (title != null) {
    node.append('title').text((d) => title(d.data, d));
  }

  if (getLabel) {
    node
      .append('text')
      .attr('dy', '0.32em')
      .attr('x', (d) => (d.children ? -6 : 6))
      .attr('text-anchor', (d) => (d.children ? 'end' : 'start'))
      .attr('paint-order', 'stroke')
      .attr('stroke', halo)
      .attr('stroke-width', haloWidth)
      .text((d, i) => getLabel[i]);
  }
};

export default TidyTree;
