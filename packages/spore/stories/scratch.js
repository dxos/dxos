//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import clsx from 'clsx';
import debug from 'debug';
import React, { useEffect, useRef, useState } from 'react';
import useResizeAware from 'react-resize-aware';
import { makeStyles } from '@material-ui/core/styles';
import blue from '@material-ui/core/colors/blue';
import grey from '@material-ui/core/colors/grey';
import { withKnobs, select } from '@storybook/addon-knobs';

import {
  FullScreen,
  Grid,
  SVG,
  useGrid,
  createGraph
} from '@dxos/gem-core';

export default {
  title: 'Scratch',
  decorators: [withKnobs]
};

const log = debug('spore:test');
debug.enable('spore:*');

const useStyles = makeStyles({
  graph: {
    '& g rect': {
      strokeWidth: 1,
      stroke: grey[500],
      fill: grey[100],
      cursor: 'pointer',
    },

    '& g.fixed rect': {
      strokeWidth: 2,
    },

    '& path': {
      fill: 'none',
      strokeWidth: 1,
      stroke: grey[500],
    },

    '& g circle': {
      strokeWidth: 1,
      stroke: grey[500],
      fill: grey[100],
      cursor: 'pointer',
    },

    '& g.selected circle': {
      fill: blue[100],
      stroke: blue[500],
    }
  }
});

const Editor = ({ line }) => {
  const classes = useStyles();
  const [resizeListener, size] = useResizeAware();

  const objects = useRef();
  const links = useRef();

  const [graph] = useState(createGraph(8, 8));
  const [simulation, setSimulation] = useState();

  const [selected, setSelected] = useState();
  const selectionRef = useRef(selected);
  useEffect(() => { selectionRef.current = selected; }, [selected]);

  const configRef = useRef({ line });
  useEffect(() => {
    configRef.current = { line };
    handleUpdate();
  }, [line]);

  const { width, height } = size;
  const grid = useGrid({ width, height, zoom: 1 });
  const geomRef = useRef({});
  useEffect(() => {
    geomRef.current = {
      scaleX: grid.scaleX,
      scaleY: grid.scaleY,
      r: grid.scaleX(5)
    };
  }, [grid]);

  //
  // Update
  //

  const shapeGenerator = group => {
    group
      .append('circle')
        .attr('cx', 0)
        .attr('cy', 0)
        .on('click', (event, d) => {
          if (d.id === selectionRef.current) {
            setSelected(undefined);
          } else {
            setSelected(d.id);
          }

          // TODO(burdon): Stale.
          // TODO(burdon): Click anywhere to deselect.
          simulation.alphaTarget(0.3).restart();
          handleUpdate();
        });
  };

  //
  // Repaint.
  //
  const handleUpdate = () => {

    //
    // Objects
    //

    d3.select(objects.current)
      .selectAll('g')
      .data(graph.nodes, d => d.id)
      .join(
        enter => enter
          .append('g')
            .attr('id', d => d.id)
            .call(shapeGenerator),
        update => update,
        exit => exit.remove()
      )
      .attr('transform', d => `translate(${d.x || 0}, ${d.y || 0})`)
      .attr('class', d => clsx({ 'selected': d.id === selectionRef.current }))
      .select('circle').attr('r', () => geomRef.current.r);

    //
    // Links
    //

    d3.select(links.current)
      .selectAll('path')
        .data(graph.links, d => d.id)
      .join('path')
        .attr('d', d => configRef.current.line(d));
  };

  //
  // Resize
  //

  useEffect(handleUpdate, [width, height]);

  //
  // Simulation
  // TODO(burdon): Option.
  //

  useEffect(() => {
    const simulation = d3.forceSimulation()
      .nodes(graph.nodes)
      .force('charge', d3.forceManyBody().strength(-50))
      .force('gravity', d3.forceRadial(50, 0, 0).strength(.01))
      .on('tick', handleUpdate)
      .on('end', () => {
        log('end');
        simulation.alphaTarget(0.3).restart();
      });

    setSimulation(simulation);

    return () => simulation.stop();
  }, [graph.nodes]);

  return (
    <FullScreen>
      {resizeListener}
      <SVG width={width} height={height}>
        <Grid grid={grid} />
        <g className={classes.graph}>
          <g ref={links} />
          <g ref={objects} />
        </g>
      </SVG>
    </FullScreen>
  );
};

//
// https://github.com/d3/d3-shape#links
// https://github.com/d3/d3-shape#curves
// http://bl.ocks.org/d3indepth/b6d4845973089bc1012dec1674d3aff8
//

const pointAdapter = node => node
  .x(d => d.x || 0)
  .y(d => d.y || 0);

// Requires an array of points.
const lineAdapter = line => ({ source, target }) => line([ source, target ]);

const line1 = lineAdapter(pointAdapter(d3.line()));
const line2 = lineAdapter(pointAdapter(d3.line().curve(d3.curveStep)));

// Requires two points.
const linkAdapter = link => ({ source, target }) => link({ source, target });

const link1 = linkAdapter(pointAdapter(d3.linkHorizontal()));
const link2 = linkAdapter(pointAdapter(d3.linkVertical()));

export const withDrag = () => {

  // NOTE: properties cannot be functions.
  const type = select('Line', {
    'straight': 0,
    'step': 1,
    'horizontal': 2,
    'vertical': 3,
  }, 0);

  const line = [line1, line2, link1, link2][type];

  return (
    <Editor line={line} />
  );
};
