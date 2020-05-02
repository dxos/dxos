//
// Copyright 2019 DxOS.org
//

import * as d3 from 'd3';
import classnames from 'classnames';

import { lineAdapter } from './adapters';

// TODO(burdon): Animation.
// https://github.com/d3/d3-transition
// https://bost.ocks.org/mike/transition/
// https://bl.ocks.org/mbostock/70d5541b547cc222aa02 (Chained)
// https://github.com/d3/d3-transition

const t = (delay = 300) => d3.transition()
  .duration(delay)
  .ease(d3.easePoly);

/**
 * Base group generator.
 */
export class Group {

  selector = null;

  createElement = context => el => {};

  removeElement = context => el => {};

  updateElement = context => el => {};

  constructor(root) {
    this._root = root;
  }

  get root() {
    return this._root;
  }

  data(data, context) {

    // Select existing.
    const selected = d3.select(this._root)
      .selectAll(this.selector)
      .data(data, d => d.id);

    // Create new elements.
    const entered = selected
      .enter()
      .call(this.createElement(context));

    // Remove old elements.
    selected
      .exit()
      .call(this.removeElement(context))
      .remove();

    // Update all remaining elements.
    // selected
    //   .merge(entered)
    //   .call(this.updateElement(context));

    this.layout(context);

    return this;
  }

  layout(context) {

    // Update all exisiting elements.
    d3.select(this._root)
      .call(this.updateElement(context));
  }
}

/**
 * Nodes
 */
export class NodeGroup extends Group {

  selector = 'g.node';

  createElement = context => el => el
    .append('svg:g')
    .attr('class', d => classnames('node', d.className))
    .attr('id', d => d.id)
    .call(this.createCircle(context));

  updateElement = context => el => el
    .transition(t())
    .on('end', () => console.log('ENDED'))
    .selectAll('g')
    .call(this.updateCircle(context));

  createCircle = context => el => el
    .append('svg:circle');

  updateCircle = ({ bounds: { width, height } }) => el => el
    .select('circle')
    .attr('r', d => 10 + Math.random() * 30)
    .attr('cx', d => d.point.x)
    .attr('cy', d => d.point.y)
}

/**
 * Links
 */
export class LinkGroup extends Group {

  selector = 'path.link';

  createElement = (context) => el => el
    .append('svg:path')
    .attr('class', d => classnames('link', d.className))
    .attr('id', d => d.id)
    .call(this.updatePath(context));

  updateElement = (context) => el => el
    .selectAll('path')
    .transition(t())
    .call(this.updatePath(context));

  updatePath = ({ data }) => el => el
    .attr('d', d => {
      const { source, target } = d;

      const get = id => data.nodes.find(n => n.id === id);

      const { point: p1 = { x: 0, y: 0 } } = get(source);
      const { point: p2 = { x: 0, y: 0 } } = get(target);

      return lineAdapter([
        { x: p1.x, y: p1.y },
        { x: p2.x, y: p2.y }
      ]);
    });
}
