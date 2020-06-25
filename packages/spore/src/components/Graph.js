//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

import { Layout, useDefaultStyles, useLayout } from '../layout';
import { GuideProjector, LinkProjector, NodeProjector } from '../projector';

/**
 * Graph compoent supports different layouts.
 */
const Graph = (props) => {
  const {
    data = {},
    selected,
    grid,
    drag,
    layout = new Layout(),
    nodeProjector = new NodeProjector(),
    linkProjector = new LinkProjector(),
    guideProjector = new GuideProjector(),        // TODO(burdon): Remove default.
    classes = useDefaultStyles()
  } = props;

  const nodes = useRef();
  const links = useRef();
  const guides = useRef();

  // Drag handler.
  useEffect(() => {
    if (drag) {
      d3.select(nodes.current)
        .call(drag.create(nodes.current));
    }
  }, [drag]);

  // Update layout.
  useLayout(layout, grid, data, data => {
    nodeProjector.update(grid, data, { group: nodes.current, selected });
    linkProjector.update(grid, data, { group: links.current });
    guideProjector.update(grid, data, { group: guides.current });
  }, [data, layout, selected]);

  return (
    <g className={classes.graph}>
      <g ref={guides} className={classes.guides} />
      <g ref={links} />
      <g ref={nodes} />
    </g>
  );
};

Graph.propTypes = {
  layout: PropTypes.object,
  grid: PropTypes.object.isRequired,
};

export default Graph;

