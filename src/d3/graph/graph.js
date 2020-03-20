//
// Copyright 2017 DxOS
//

import canonicalize from 'canonicalize';
import defaults from 'lodash.defaults';
import hash from 'string-hash';

import * as d3 from 'd3';
import classnames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

import { bounds, resize, Container, delayedListener } from '../../Container';

import { createDrag } from './drag';
import { Physics } from './physics';

// Marker factory.
const CreateMarkers = ({ arrowSize }) => el => el
  .selectAll('marker')
  .data([
    // https://www.dashingd3js.com/svg-paths-and-d3js
    {
      name: 'arrow',
      path: 'M -8,-4 L 0,0 L -8,+4',
      viewbox: '-8 -4 16 8'
    }
  ])
  .join('marker')
    .attr('id', d => 'marker_' + d.name)
    .attr('markerHeight', arrowSize)
    .attr('markerWidth', arrowSize)
    .attr('markerUnits', 'strokeWidth')
    .attr('orient', 'auto')
    .attr('refX', 0)
    .attr('refY', 0)
    .attr('viewBox', d => d.viewbox)
      .append('svg:path')
      .attr('d', d => d.path);

/**
 * Graph utils.
 */
class GraphLayout {

  // Creates array of points from link points.
  // Specify circumference if using arrows.
  static createPoints = ({ source, target }, sourceSize, targetSize, circumference = true) => {
    if (circumference) {
      let angle = Math.atan2(target.x - source.x, target.y - source.y);
      return [
        {
          x: source.x + sourceSize *  Math.sin(angle),
          y: source.y - sourceSize * -Math.cos(angle)
        },
        {
          x: target.x + targetSize * -Math.cos(Math.PI / 2 - angle),
          y: target.y - targetSize *  Math.sin(Math.PI / 2 - angle)
        }
      ];
    } else {
      return [
        { x: source.x, y: source.y },
        { x: target.x, y: target.y }
      ]
    }
  };

  // Creates a path between nodes.
  // https://github.com/d3/d3-shape#lines
  static lineAdapter = d3.line()
    .x(d => d.x || 0)
    .y(d => d.y || 0)
    // .curve(d3.curveLinear);
}

/**
 * Generic D3 Graph.
 */
export class Graph extends React.Component {

  //
  // Life-cycle:
  //
  //  Component.getDerivedStateFromProps (when props changed, triggers render)
  //
  //  Component.render
  //    doLayout
  //
  //  Component.componentDidMount
  //    doLayout
  //
  //  Container.handleRender
  //    doLayout
  //

  // TODO(burdon): Factor out.
  static canonicalizeGraph(data) {
    const { nodes = [], links = [] } = data || {};

    let canonical = {
      nodes: nodes.map(({ id }) => ({ id })),
      links: links.map(({ source, target }) => ({ source: source.id, target: target.id }))
    };

    return canonicalize(canonical);
  }

  static getDerivedStateFromProps(props, state) {
    // console.log('getDerivedStateFromProps');
    const { data: { nodes, links }, physics } = props;
    const { data: { nodes: currentNodes = [] } = {} } = state;

    // TODO(burdon): Check hashes before doing work?

    // Merge existing state (e.g., position, vector).
    const mergedNodes = nodes.map(node => {
      const existingNode = currentNodes.find(currentNode => currentNode.id === node.id);

      /*
      id: "57c02c03-faa4-5e4b-b3ca-3339711b3d60"
      index: 5
      label: "lenvebade"
      vx: -0.0005096737331049261
      vy: -0.0008978483773788011
      x: -103.18157226211734
      y: -6.604230228787266
      */

      // TODO(burdon): Just extract expected data and merge into existing nodes?
      if (!window.__count) window.__count = 0;
      return defaults({ t: window.__count++ }, node, existingNode);
    });

    // Convert link by string to node.
    const nodeId = ref => (typeof ref === 'string') ? ref : ref.id;
    const mergedLinks = links.map(({ id, source, target }) => {
      return {
        id: id || `${nodeId(source)}-${nodeId(target)}`,
        source: mergedNodes.find(node => node.id === nodeId(source)),
        target: mergedNodes.find(node => node.id === nodeId(target))
      };
    });

    return {
      dataHash: hash(Graph.canonicalizeGraph({ nodes: mergedNodes, links: mergedLinks })),
      physicsHash: hash(canonicalize(physics.config)),
      data: {
        nodes: mergedNodes,
        links: mergedLinks
      }
    };
  }

  static propTypes = {
    arrowSize: PropTypes.number,
    className: PropTypes.string,
    data: PropTypes.object,
    draggable: PropTypes.bool,
    layout: PropTypes.func,
    physics: PropTypes.object,
    sizeAdapter: PropTypes.func,

    onCreate: PropTypes.func,
    onDelete: PropTypes.func,
    onLink: PropTypes.func,
    onSelect: PropTypes.func
  };

  static defaultProps = {
    arrowSize: 12,
    draggable: false,
    physics: new Physics(),
    sizeAdapter: () => 12
  };

  state = {
    hash: 0,
    data: {
      nodes: [],
      links: []
    }
  };

  _simulation = d3.forceSimulation();

  _dataHash = 0;
  _physicsHash = 0;

  get svg() {
    return this._svg;
  }

  get bounds() {
    return bounds(this._svg);
  }

  get data() {
    let { data } = this.state;
    return data;
  }

  getLinkElements(linkIds) {
    return d3.select(this._linkGroup)
      .selectAll('path.link')
      .filter(d => linkIds.indexOf(d.id) !== -1);
  }

  /**
   * Layout SVG elements.
   */
  doLayout() {
    const { dataHash, physicsHash, data: { nodes = [], links = [] } } = this.state;
    // console.log('doLayout', this.state.data, this.bounds.height);

    // May be called before mounted.
    if (!this.bounds.height) {
      this._dataHash = 0;
      this._physicsHash = 0;
      return;
    }

    // Update the simulation.
    const { physics } = this.props;
    if (physics) {
      if (this._dataHash !== dataHash || this._physicsHash !== physicsHash) {
        physics.apply(this._simulation, nodes, links);

        this._dataHash = dataHash;
        this._physicsHash = physicsHash;
      }
    }

    const fadeOutTransition = d3.transition('fade').duration(500);

    //
    // Nodes.
    // https://github.com/d3/d3-selection/blob/v1.4.0/README.md#selection_data
    //

    const { onDelete, onSelect } = this.props;
    const { sizeAdapter } = this.props;

    const selected = d3.select(this._nodeGroup)
      .selectAll('g.node')
      .data(nodes, d => d.id);

    // Fade out deleted nodes.
    const exited = selected.exit()
      .transition(fadeOutTransition)
      .style('opacity', 0)
      .call(el => el.selectAll('circle')
        .style('stroke-width', 1)
        .attr('r', 3)
      )
      .remove();

    // New nodes.
    const entered = selected.enter()
      .append('svg:g')
      .attr('class', d => classnames('node', d.className))
      .attr('id', d => d.id)

      .on('mouseover', function(d) {
        d3.select(this).classed('highlight', true);
      })
      .on('mouseout', function(d) {
        d3.select(this).classed('highlight', false);
      })

      // TODO(burdon): Factor out events (separate call). EventEmitter?
      .on('click', function(d) {
        if (d3.event.altKey && onDelete) {
          onDelete(d.id);
        } else if (onSelect) {
          onSelect(d.id)
        }
      })

      // Circle
      // Initial position.
      .call(el => el.append('svg:circle'))

      // Text
      .call(el => el.append('svg:text')
        .style('font-size', d => Math.max(12, sizeAdapter(d)))
        .attr('x', d => sizeAdapter(d) + 6)
        .attr('dy', '.3em')
      );

    // Update all.
    const merged = selected.merge(entered);

    merged
      .interrupt('fade')
      .style('opacity', 1);

    merged
      .select('circle')
        .interrupt('fade')
        .attr('class', d => classnames('node', d.className))
        .attr('r', d => sizeAdapter(d));

    merged
      .select('text')
        .text(d => d.label);

    //
    // Links
    //

    {
      const selected = d3.select(this._linkGroup)
        .selectAll('path.link')
        .data(links, d => d.id);

      selected.exit()
        .remove();

      selected.enter()
        .append('svg:path')
        .attr('class', d => classnames('link', d.className))
        .attr('id', d => d.id)
        .attr('marker-end', d => 'url(#marker_arrow)');
    }
  }

  /**
   * Update SVG elements.
   */
  doUpdate() {
    let { sizeAdapter } = this.props;

    // Position the node group.
    d3.select(this._nodeGroup)
      .selectAll('g.node')
      .attr('transform', d => `translate(${d.x || 0}, ${d.y || 0})`);

    // https://bl.ocks.org/dimitardanailov/6f0a451d4457b9fa7bf6e0dddcd0f468
    d3.select(this._linkGroup)
      .selectAll('path.link')
      .attr('d', d => GraphLayout.lineAdapter(
        GraphLayout.createPoints(d, sizeAdapter(d.source), sizeAdapter(d.target))));
  };

  componentDidMount() {
    // console.log('componentDidMount');
    const { arrowSize, draggable } = this.props;

    // Create markers.
    d3.select(this._defs)
      .call(CreateMarkers({ arrowSize }));

    // Dragging.
    if (draggable) {
      const { onLink, onCreate } = this.props;
      d3.select(this._svg)
        .call(createDrag(this._svg, d3.select(this._dragGroup), this._simulation, { onLink, onCreate }));
    }

    // Start physics simulation.
    this._simulation
      .on('tick', this.doUpdate.bind(this));

    this.doLayout();
  }

  componentWillUnmount() {
    this._simulation.stop();
  }

  render() {
    const { className } = this.props;

    const handler = (bounds) => {
      resize(this._svg, bounds);

      this.doLayout();
    };

    return (
      <Container {...{ className }} onRender={handler}>
        <svg ref={el => this._svg = el}>
          <defs ref={el => this._defs = el}/>

          <g ref={el => this._dragGroup = el}/>
          <g ref={el => this._linkGroup = el}/>
          <g ref={el => this._nodeGroup = el}/>
        </svg>
      </Container>
    );
  }
}
