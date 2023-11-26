//
// Copyright 2023 DXOS.org
//

import * as d3 from 'd3';
import { type HierarchyNode } from 'd3-hierarchy';

const color = {
  in: '#00f',
  out: '#f00',
  none: '#ccc',
  text: '#333',
};

// Create hierarchical ID.
const getId = (node: HierarchyNode<Datum>): string =>
  `${node.parent ? getId(node.parent) + '/' : ''}${node.data.id.slice(0, 4)}`;

const getName = (datum: Datum) => datum.id;

type Options = {
  path?: string;
  id?: any;
  parentId?: any;
  children?: any;

  radius?: number;
  padding?: number;
};

// https://github.com/d3/d3-hierarchy
// https://observablehq.com/@d3/hierarchical-edge-bundling?intent=fork
const HierarchicalEdgeBundling = (s: SVGSVGElement, data: Datum, options: Options = {}) => {
  const svg = d3.select(s);
  svg.selectAll('*').remove();

  const {
    // data is either tabular (array of objects) or hierarchy (nested objects)
    path, // as an alternative to id and parentId, returns an array identifier, imputing internal nodes
    id = Array.isArray(data) ? (d: any) => d.id : null, // if tabular data, given a d in data, returns a unique identifier (string)
    parentId = Array.isArray(data) ? (d: any) => d.parentId : null, // if tabular data, given a node d, returns its parent’s identifier
    children, // if hierarchical data, given a d in data, returns its children

    radius = 600,
    padding = 100,
  } = options;

  // const hierarchy = d3.hierarchy<Datum>(data);
  // .sort((a, b) => d3.ascending(a.height, b.height) || d3.ascending(getName(a.data), getName(b.data)));

  // https://d3js.org/d3-hierarchy/hierarchy
  const hierarchy =
    // path != null
    //   ? d3.stratify().path(id)(data)
    //   : getId != null || parentId != null
    //   ? d3.stratify().id(id).parentId(parentId)(data)
    d3.hierarchy(data, children);

  console.log(data);
  // console.log(data.id);
  // console.log(data.children[0].id);
  // console.log(hierarchy);
  console.log(hierarchy.leaves().map((d) => d.data.id.slice(0, 4)));
  return;

  console.log(bilink(hierarchy));

  const tree = d3.cluster<Datum>().size([2 * Math.PI, radius - padding]);
  const root = tree(bilink(hierarchy));

  // eslint-disable-next-line unused-imports/no-unused-vars
  const node = svg
    .append('g')
    .selectAll()
    .data(root.leaves())
    .join('g')
    .attr('transform', (d) => `rotate(${(d.x * 180) / Math.PI - 90}) translate(${d.y},0)`)
    .append('text')
    .attr('fill', color.text)
    .attr('dy', '0.31em')
    .attr('x', (d) => (d.x < Math.PI ? 6 : -6))
    .attr('text-anchor', (d) => (d.x < Math.PI ? 'start' : 'end'))
    .attr('transform', (d) => (d.x >= Math.PI ? 'rotate(180)' : null))
    .text((d: any) => d.data.name)
    .each(function (d: any) {
      d.text = this;
    })
    // .on('mouseover', overed)
    // .on('mouseout', outed)
    .call((text) =>
      text
        // .append('title')
        .text((d: any) => `${getId(d)} [${[(d as any).outgoing.length]} ${[(d as any).incoming.length]}]`),
    );

  const line = d3
    .lineRadial()
    .curve(d3.curveBundle.beta(0.85))
    .radius((d: any) => d.y)
    .angle((d: any) => d.x);

  // eslint-disable-next-line unused-imports/no-unused-vars
  const link = svg
    .append('g')
    .attr('stroke', color.none)
    .attr('fill', 'none')
    .selectAll()
    .data(root.leaves().flatMap((leaf: any) => leaf.outgoing))
    .join('path')
    .style('mix-blend-mode', 'multiply')
    .attr('d', ([i, o]) => line(i.path(o)))
    .each(function (d) {
      d.path = this;
    });

  // function overed(event: any, d: X) {
  //   link.style('mix-blend-mode', null);
  // d3.select(this).attr('font-weight', 'bold');
  // d3.selectAll(d.incoming.map((d) => d.path))
  //   .attr('stroke', color.in)
  //   .raise();
  // d3.selectAll((d as any).incoming.map(([d]) => d.text))
  //   .attr('fill', color.in)
  //   .attr('font-weight', 'bold');
  // d3.selectAll(d.outgoing.map((d) => d.path))
  //   .attr('stroke', color.out)
  //   .raise();
  // d3.selectAll(d.outgoing.map(([, d]) => d.text))
  //   .attr('fill', color.out)
  //   .attr('font-weight', 'bold');
  // }

  // function outed(event: any, d: HierarchyNode<Datum>) {
  //   // @ts-ignore
  //   d3.select(this).attr('font-weight', null);
  //   d3.selectAll(d.incoming.map((d) => d.path)).attr('stroke', null);
  //   d3.selectAll(d.incoming.map(([d]) => d.text))
  //     .attr('fill', null)
  //     .attr('font-weight', null);
  //   d3.selectAll(d.outgoing.map((d) => d.path)).attr('stroke', null);
  //   d3.selectAll(d.outgoing.map(([, d]) => d.text))
  //     .attr('fill', null)
  //     .attr('font-weight', null);
  // }
};

type Datum = {
  id: string;
  children: Datum[];
};

// Monkey-patch incoming/outgoing.
const bilink = (root: HierarchyNode<Datum>) => {
  const map = new Map(root.leaves().map((d) => [d.data.id, d]));

  for (const d of root.leaves()) {
    console.log(d.data.id);
    (d as any).incoming = [];
    (d as any).outgoing = d.data.children.map((d) => [d, map.get(d.id)!]) ?? [];
  }

  for (const d of root.leaves()) {
    for (const o of (d as any).outgoing) {
      o[1].incoming.push(o);
    }
  }

  return root;
};

export default HierarchicalEdgeBundling;
