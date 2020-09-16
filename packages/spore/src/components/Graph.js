//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import merge from 'lodash.merge';
import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { makeStyles } from '@material-ui/core/styles';
import * as colors from '@material-ui/core/colors';

import { useLayout, ForceLayout } from '../layout';
import { GuideProjector, LinkProjector, NodeProjector } from '../projector';

// TODO(burdon): Use theme.
const defaultColor = 'grey';
const highlightColor = 'orange';
const selectedColor = 'blue';
const contrastColor = 'red';
const guideColor = 'blueGrey';

export const useGraphStyles = makeStyles(() => ({
  root: {},
  guides: {
    '& circle.guide': {
      strokeWidth: 8,
      stroke: colors[guideColor][50],
      fill: 'none',
      opacity: .5
    },
    '& circle.bullet': {
      fill: colors[contrastColor][400]
    }
  },
  links: ({ color = defaultColor }) => ({
    '& path.link': {
      fill: 'none',
      strokeWidth: 1,
      stroke: colors[color][500]
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
    '& g.node text': {
      fontFamily: 'sans-serif',
      fontWeight: 100
    },
    '& g.highlight circle': {
      fill: colors[highlightColor][200]
    },
    '& g.selected circle': {
      fill: colors[selectedColor][200]
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
    layout = new ForceLayout(),
    guideProjector = new GuideProjector(),
    linkProjector = new LinkProjector(),
    nodeProjector = new NodeProjector(),
    classes
  } = props;

  const clazzes = merge(useGraphStyles(), classes);

  const guideGroup = useRef();
  const linkGroup = useRef();
  const nodeGroup = useRef();

  // Drag handler.
  useEffect(() => {
    if (drag) {
      d3.select(nodeGroup.current)
        .call(drag.create(nodeGroup.current));
    }
  }, [drag]);

  // Update layout.
  // NOTE: Called every time force update changes data (positions, etc.)
  useLayout(layout, grid, data, () => {

    // TODO(burdon): Detach old layout!

    guideProjector.update(grid, layout.data, { group: guideGroup.current });
    nodeProjector.update(grid, layout.data, { group: nodeGroup.current, selected });
    linkProjector.update(grid, layout.data, { group: linkGroup.current });
  }, [data, grid.size, layout, selected]);

  return (
    <g className={clazzes.root}>
      <g ref={guideGroup} className={clazzes.guides} />
      <g>
        <g className={clazzes.links} ref={linkGroup} />
        <g className={clazzes.nodes} ref={nodeGroup} />
      </g>
    </g>
  );
};

Graph.propTypes = {
  layout: PropTypes.object,
  grid: PropTypes.object.isRequired,
};

export default Graph;

