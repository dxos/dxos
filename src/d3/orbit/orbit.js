//
// Copyright 2019 DxOS
//

import * as d3 from 'd3';
import React, { Component } from 'react';

import { Container, delayedListener } from '../../Container';

// TODO(burdon): Move to utils.
const children = (root, nodes, links) => {
  return links.map(({ source, target }) => {
    if (root === source.id) {
      return nodes.find(node => node.id === target.id);
    }
  }).filter(item => item !== undefined);
};

export class Orbit extends Component {

  _angle = 0;

  constructor() {
    super();

    let last = 0;
    d3.timer(elapsed => {
      this.doLayout();
      this._angle += ((elapsed - last) * 0.0001);
      last = elapsed;
    });
  }

  doLayout() {
    // TODO(burdon): Move to state.
    // TODO(burdon): Center then iterate outward (by relationship).
    const { data } = this.props;

    const nodes = [];
    const orbits = [];
    const layout = {
      [data.root]: { x: 0, y: 0, r: 240, s: 24, a: this._angle }
    };

    const f = (root) => {
      const n = data.nodes.find(node => node.id === root);
      nodes.push(n);

      const c = children(root, data.nodes, data.links);
      const l = layout[root];

      // TODO(burdon): Start with angle from parent.
      let a = l.a - (Math.PI / 2);

      // TODO(burdon): Count actual children.
      const da = Math.PI * 2 / c.length;

      c.forEach(node => {
        if (!layout[node.id]) {
          nodes.push(node);
          // orbits.push(node);

          layout[ node.id ] = {
            x: l.x + Math.cos(a) * l.r,
            y: l.y + Math.sin(a) * l.r,
            r: l.r * .5,
            s: l.s * .7,
            a: l.a + -2 * this._angle
          };

          a += da;

          f(node.id);
        }
      });

      if (c.length) {
        orbits.push(n);
      }
    };

    f(data.root);

    // Orbits
    {
      const selected = d3.select(this._orbitGroup)
        .selectAll('g.orbit')
        .data(orbits, d => d.id);

      const exited = selected.exit()
        .remove();

      const entered = selected.enter()
        .append('svg:g')
        .attr('class', 'orbit')
        .attr('id', d => d.id)
        .call(el => el.append('svg:circle'));

      const merged = selected.merge(entered)
        .selectAll('circle')
        .call(el => el
          .attr('cx', d => layout[d.id].x)
          .attr('cy', d => layout[d.id].y)
          .attr('r', d => layout[d.id].r)
        );
    }

    // Nodes
    {
      const selected = d3.select(this._nodeGroup)
        .selectAll('g.node')
        .data(nodes, d => d.id);

      const exited = selected.exit()
        .remove();

      const entered = selected.enter()
        .append('svg:g')
        .attr('class', 'node')
        .attr('id', d => d.id)
        .call(el => el.append('svg:circle'));

      const merged = selected.merge(entered)
        .selectAll('circle')
        .call(el => {
          el
          .attr('cx', d => layout[d.id].x)
          .attr('cy', d => layout[d.id].y)
          .attr('r', d => layout[d.id].s)
        });
    }

    // Links
    {
      const lineAdapter = d3.line()
        .x(d => d.x || 0)
        .y(d => d.y || 0);

      const selected = d3.select(this._linkGroup)
        .selectAll('path.link')
        .data(data.links, d => d.id);

      const exited = selected.exit()
        .remove();

      const entered = selected.enter()
        .append('svg:path')
        .attr('class', 'link')
        .attr('id', d => d.id);

      const merged = selected.merge(entered)
        .attr('d', ({ source, target }) => lineAdapter([
          { x: layout[source.id].x, y: layout[source.id].y },
          { x: layout[target.id].x, y: layout[target.id].y }
        ]));
    }
  }

  handleResize = delayedListener(({ width, height }) => {
    d3.select(this._svg)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `${-width/2}, ${-height/2}, ${width}, ${height}`);

    this.doLayout();
  });

  render() {
    const { className } = this.props;

    // Triggered by state change.
    this.doLayout();

    return (
      <Container {...{ className }} onRender={this.handleResize}>
        <svg ref={el => this._svg = el}>
          <g ref={el => this._orbitGroup = el}/>
          <g ref={el => this._linkGroup = el}/>
          <g ref={el => this._nodeGroup = el}/>
        </svg>
      </Container>
    );
  }
}
