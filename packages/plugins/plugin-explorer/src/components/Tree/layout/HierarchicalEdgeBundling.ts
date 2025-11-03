//
// Copyright 2023 DXOS.org
// Copyright 2022 Observable, Inc.
//

import { cluster, curveBundle, hierarchy, lineRadial, select } from 'd3';
import { type HierarchyNode } from 'd3-hierarchy';

import { type TreeOptions } from '../Tree';
import { type TreeNode } from '../types';

// Create hierarchical ID.
// eslint-disable-next-line unused-imports/no-unused-vars
const getId = (node: HierarchyNode<TreeNode>): string =>
  `${node.parent ? getId(node.parent) + '/' : ''}${node.data.id.slice(0, 4)}`;

// https://github.com/d3/d3-hierarchy
// https://observablehq.com/@d3/hierarchical-edge-bundling?intent=fork
const HierarchicalEdgeBundling = (s: SVGSVGElement, data: TreeNode, options: TreeOptions) => {
  const svg = select(s);
  svg.selectAll('*').remove();

  const { radius = 600, padding = 100, slots } = options;

  // https://d3js.org/d3-hierarchy/hierarchy
  const root = hierarchy(flatten(data));
  // .sort((a, b) => ascending(a.height, b.height) || ascending(getName(a.data), getName(b.data)));

  const tree = cluster<TreeNode>().size([2 * Math.PI, radius - padding]);
  const layout = tree(addLinks(root));

  // eslint-disable-next-line unused-imports/no-unused-vars
  const node = svg
    .append('g')
    .selectAll()
    .data(layout.leaves())
    .join('g')
    .attr('transform', (d) => `rotate(${d.x * (180 / Math.PI) - 90}) translate(${d.y},0)`)
    .append('text')
    .attr('class', slots?.text ?? '')
    .attr('dy', '0.31em') // TODO(burdon): Based on font size.
    .attr('x', (d) => (d.x < Math.PI ? 6 : -6))
    .attr('text-anchor', (d) => (d.x < Math.PI ? 'start' : 'end'))
    .attr('transform', (d) => (d.x >= Math.PI ? 'rotate(180)' : null))
    // .text((d: any) => d.data.id)
    // .each(function (d: any) {
    //   d.text = this;
    // })
    // .on('mouseover', overed)
    // .on('mouseout', outed)
    .call(
      (text) => text.text((d: any) => d.data.id.slice(0, 8)),
      // .text((d: any) => `${getId(d)} [${[(d as any).outgoing?.length ?? 0]}]`),
    );

  // https://d3js.org/d3-shape/radial-line
  const line = lineRadial()
    .curve(curveBundle.beta(0.85))
    .radius((d: any) => d.y)
    .angle((d: any) => d.x);

  // eslint-disable-next-line unused-imports/no-unused-vars
  const links = svg
    .append('g')
    .selectAll()
    .data(layout.leaves().flatMap((leaf: any) => leaf.outgoing))
    .join('path')
    .style('mix-blend-mode', 'multiply')
    .attr('class', slots?.path ?? '')
    .attr('d', ([i, o]) => line(i.path(o)))
    .each(function (d) {
      d.path = this;
    });

  // function overed(event: any, d: X) {
  //   link.style('mix-blend-mode', null);
  // select(this).attr('font-weight', 'bold');
  // selectAll(d.incoming.map((d) => d.path))
  //   .attr('stroke', color.in)
  //   .raise();
  // selectAll((d as any).incoming.map(([d]) => d.text))
  //   .attr('fill', color.in)
  //   .attr('font-weight', 'bold');
  // selectAll(d.outgoing.map((d) => d.path))
  //   .attr('stroke', color.out)
  //   .raise();
  // selectAll(d.outgoing.map(([, d]) => d.text))
  //   .attr('fill', color.out)
  //   .attr('font-weight', 'bold');
  // }

  // function outed(event: any, d: HierarchyNode<Datum>) {
  //   // @ts-ignore
  //   select(this).attr('font-weight', null);
  //   selectAll(d.incoming.map((d) => d.path)).attr('stroke', null);
  //   selectAll(d.incoming.map(([d]) => d.text))
  //     .attr('fill', null)
  //     .attr('font-weight', null);
  //   selectAll(d.outgoing.map((d) => d.path)).attr('stroke', null);
  //   selectAll(d.outgoing.map(([, d]) => d.text))
  //     .attr('fill', null)
  //     .attr('font-weight', null);
  // }
};

// Monkey-patch with incoming/outgoing nodes.
const addLinks = (root: HierarchyNode<TreeNode>) => {
  // Map of nodes indexed by ID.
  const nodes = new Map(root.descendants().map((d) => [d.data.id, d]));
  const parents = root.descendants().reduce((map, d) => {
    if (d.children?.length) {
      map.set(d.data.id, d);
    }
    return map;
  }, new Map<string, HierarchyNode<TreeNode>>());

  for (const d of root.leaves()) {
    // (d as any).incoming = [];
    const parent = parents.get(d.data.id);
    if (parent) {
      // Skip the first node which is a placeholder created by flatten().
      (d as any).outgoing = parent.data.children?.slice(1).map((child) => [d, nodes.get(child.id)!]) ?? [];
    } else {
      (d as any).outgoing = [];
    }
  }

  // for (const d of root.leaves()) {
  //   for (const [_, o] of (d as any).outgoing) {
  //     o.incoming.push(o);
  //   }
  // }

  return root;
};

/**
 * We are using a hierarchy in order to group nodes by parent, but we want the parent
 * nodes to be positioned at the first level along with all descendents.
 * So we add a placeholder for all parents at the head of each group.
 * @param node
 */
const flatten = (node: TreeNode) => {
  const clone: TreeNode = {
    id: node.id,
  };

  // TODO(burdon): NOTE: Should exclude schema (since requires a tree).
  if (node.children?.length) {
    const children = node.children.map((child) => flatten(child));
    clone.children = [{ id: node.id }, ...children];
  }

  return clone;
};

export default HierarchicalEdgeBundling;
