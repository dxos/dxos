//
// Copyright 2023 DXOS.org
//

import * as d3 from 'd3';

// Copyright 2022 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/radial-tree
// https://observablehq.com/@d3/tree
const RadialTree = (s: SVGSVGElement, data: any, options: any = {}) => {
  const svg = d3.select(s);
  svg.selectAll('*').remove();

  const {
    // data is either tabular (array of objects) or hierarchy (nested objects)
    path, // as an alternative to id and parentId, returns an array identifier, imputing internal nodes
    id = Array.isArray(data) ? (d: any) => d.id : null, // if tabular data, given a d in data, returns a unique identifier (string)
    parentId = Array.isArray(data) ? (d: any) => d.parentId : null, // if tabular data, given a node d, returns its parent’s identifier
    children, // if hierarchical data, given a d in data, returns its children

    tree = d3.tree, // layout algorithm (typically d3.tree or d3.cluster)
    separation = tree === d3.tree
      ? (a: any, b: any) => (a.parent === b.parent ? 1 : 2) / a.depth
      : (a: any, b: any) => (a.parent === b.parent ? 1 : 2),
    sort, // how to sort nodes prior to layout (e.g., (a, b) => d3.descending(a.height, b.height))
    label, // given a node d, returns the display name
    title, // given a node d, returns its hover text
    link, // given a node d, its link (if any)
    linkTarget = '_blank', // the target attribute for links (if any)

    radius = 400,
    r = 4, // radius of nodes
    arc = 2 * Math.PI,

    fill = '#999', // fill for nodes
    stroke = '#555', // stroke for links
    strokeWidth = 1.5, // stroke width for links
    strokeOpacity = 1, // stroke opacity for links
    strokeLinejoin, // stroke line join for links
    strokeLinecap, // stroke line cap for links

    text = 'gray', // fill for text
    halo = 'white', // color of label halo
    haloWidth = 4, // padding around the labels
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
  if (sort) {
    root.sort(sort);
  }

  // Compute labels and titles.
  const descendants = root.descendants();
  const getLabel = label === null ? null : descendants.map((d) => label(d.data, d));

  // Compute the layout.
  const layout = tree().size([arc, radius]).separation(separation);
  layout(root);

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
    .attr('target', link == null ? null : linkTarget)
    .attr('transform', (d: any) => `rotate(${(d.x * 180) / Math.PI}) translate(${d.y},0)`);

  node
    .append('circle')
    .attr('fill', (d) => (d.children ? stroke : fill))
    .attr('r', r);

  if (title != null) {
    node.append('title').text((d) => title(d.data, d));
  }

  // Text.
  if (getLabel) {
    node
      .append('text')
      .attr('fill', text)
      .attr('transform', (d: any) => `rotate(${d.x >= Math.PI ? 180 : 0})`)
      .attr('dy', '0.32em')
      // eslint-disable-next-line no-mixed-operators
      .attr('x', (d: any) => (d.x < Math.PI === !d.children ? 6 : -6))
      // eslint-disable-next-line no-mixed-operators
      .attr('text-anchor', (d: any) => (d.x < Math.PI === !d.children ? 'start' : 'end'))
      .attr('paint-order', 'stroke')
      .attr('stroke', halo)
      .attr('stroke-width', haloWidth)
      .text((d, i) => getLabel[i]);
  }

  return svg.node();
};

export default RadialTree;
