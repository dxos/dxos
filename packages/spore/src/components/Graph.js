//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import merge from 'lodash.merge';
import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { makeStyles } from '@material-ui/core/styles';
import * as colors from '@material-ui/core/colors';

import { useLayout, Layout } from '../layout';
import { GuideProjector, LinkProjector, NodeProjector } from '../projector';

const defaultColor = 'grey';
const highlightColor = 'orange';
const selectedColor = 'blue';
const guideColor = 'blueGrey';

export const useGraphStyles = makeStyles(() => ({
  root: {},
  guides: {
    '& circle': {
      strokeWidth: 8,
      stroke: colors[guideColor][50],
      fill: 'none',
      opacity: .5
    }
  },
  links: ({ color = defaultColor }) => ({
    '& path.link': {
      fill: 'none',
      strokeWidth: 1,
      stroke: colors[color][500],
    }
  }),
  nodes: ({ color = defaultColor }) => ({
    '& g.node rect': {
      strokeWidth: 1,
      stroke: colors[color][800],
      fill: colors[color][200],
      cursor: 'pointer'
    },
    '& g.node circle': {
      strokeWidth: 1,
      stroke: colors[color][800],
      fill: colors[color][200],
      cursor: 'pointer'
    },
    '& g.highlight circle': {
      fill: colors[highlightColor][200],
    },
    '& g.selected circle': {
      fill: colors[selectedColor][200],
    }
  })
}));

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
    guideProjector = new GuideProjector(),
    linkProjector = new LinkProjector(),
    nodeProjector = new NodeProjector(),
    classes
  } = props;

  const clazzes = merge(useGraphStyles(), classes);

  const guides = useRef();
  const links = useRef();
  const nodes = useRef();

  // Drag handler.
  useEffect(() => {
    if (drag) {
      d3.select(nodes.current)
        .call(drag.create(nodes.current));
    }
  }, [drag]);

  // Update layout.
  useLayout(layout, grid, data, data => {
    guideProjector.update(grid, data, { group: guides.current });
    nodeProjector.update(grid, data, { group: nodes.current, selected });
    linkProjector.update(grid, data, { group: links.current });
  }, [data, grid.size, layout, selected]);

  return (
    <g className={clazzes.root}>
      <g ref={guides} className={clazzes.guides} />
      <g>
        <g className={clazzes.links} ref={links} />
        <g className={clazzes.nodes} ref={nodes} />
      </g>
    </g>
  );
};

Graph.propTypes = {
  layout: PropTypes.object,
  grid: PropTypes.object.isRequired,
};

export default Graph;

