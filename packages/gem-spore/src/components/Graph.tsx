//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import * as d3 from 'd3';
import merge from 'lodash.merge';
import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { makeStyles } from '@material-ui/core/styles';
import * as colors from '@material-ui/core/colors';

import { GraphType, GridType } from '@dxos/gem-core';

import { Layout, useLayout } from '../layout';
import { GuideProjector, LinkProjector, NodeProjector, Projector } from '../projector';

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
  links: ({ color = defaultColor }: { color?: any } = {}) => ({
    '& path.link': {
      fill: 'none',
      strokeWidth: 1,
      stroke: colors[color][500]
    }
  }),
  nodes: ({ color = defaultColor }: { color?: any } = {}) => ({
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

export interface GraphProps {
  data: GraphType;
  grid: GridType;
  drag?: any; // TODO(burdon): Type?
  selected?: any; // TODO(burdon): Type?
  layout: Layout;
  guideProjector?: Projector;
  linkProjector?: Projector;
  nodeProjector?: Projector;
  classes?: any;
}

/**
 * Graph compoent supports different layouts.
 */
const Graph = (props: GraphProps) => {
  const {
    data = {},
    grid,
    selected,
    drag,
    layout,
    guideProjector = new GuideProjector(),
    linkProjector = new LinkProjector(),
    nodeProjector = new NodeProjector(),
    classes
  } = props;
  assert(layout);
  const clazzes = merge(useGraphStyles({}), classes);

  // TODO(burdon): Selection is stale.
  // TODO(burdon): Highlight is stale while moving.
  const s = useRef(null);
  useEffect(() => {
    s.current = selected;
  }, [selected]);

  const guideGroup = useRef(null);
  const linkGroup = useRef(null);
  const nodeGroup = useRef(null);

  // Drag handler.
  useEffect(() => {
    if (drag) {
      d3.select(nodeGroup.current)
        .call(drag.create(nodeGroup.current));
    }
  }, [drag]);

  // Update layout.
  // NOTE: Called every time force update changes data (positions, etc.)
  // TODO(burdon): Different pattern?
  useLayout(layout, grid, data, () => {
    guideProjector.update(grid, layout.data, { group: guideGroup.current });
    nodeProjector.update(grid, layout.data, { group: nodeGroup.current, selected: s.current });
    linkProjector.update(grid, layout.data, { group: linkGroup.current });
  }, [selected]); // TODO(burdon): Test selection updates layout.

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

