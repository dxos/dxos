//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import debug from 'debug';
import faker from 'faker';
import React, { useEffect, useRef, useState } from 'react';
import useResizeAware from 'react-resize-aware';

import { boolean, withKnobs } from '@storybook/addon-knobs';

import {
  FullScreen,
  Grid,
  SVG,
  createGraph,
  createItems,
  createTree,
  useGraphGenerator,
  useGrid,
  useObjectMutator
} from '@dxos/gem-core';

import {
  BoxProjector,
  ForceLayout,
  GridLayout,
  GuideProjector,
  NodeProjector,
  RadialLayout,
  RandomLayout,
  TreeLayout,
  TreeProjector,
  useGraphStyles,
  useLayout,
} from '../src';
import { useDataButton } from './util';

export default {
  title: 'Layout',
  decorators: [withKnobs]
};

const log = debug('dxos:spore:demo');
debug.enable('dxos:spore:*');

/**
 * Grid component.
 */
export const Primary = () => {
  const [resizeListener, size] = useResizeAware();
  const grid = useGrid(size);

  return (
    <FullScreen>
      {resizeListener}
      <SVG width={size.width} height={size.height}>
        <Grid grid={grid} showAxis={true} showGrid={true} />
      </SVG>
    </FullScreen>
  );
};

/**
 * Box projector.
 */
export const Boxes = () => {
  const classes = useGraphStyles({});
  const [resizeListener, size] = useResizeAware();
  const grid = useGrid(size, 1);

  const [data] = useDataButton(() => createGraph(faker.random.number(32), 8));

  const nodes = useRef(null);
  const layout = new GridLayout();
  const projector = new BoxProjector();

  useLayout(layout, grid, data, () => {
    projector.update(grid, layout.data, { group: nodes.current });
  });

  return (
    <FullScreen>
      {resizeListener}
      <SVG width={size.width} height={size.height}>
        <Grid grid={grid} showAxis={true} />
        <g ref={nodes} className={classes.nodes} />
      </SVG>
    </FullScreen>
  );
};

/**
 * Tree layout.
 */
export const Tree = () => {
  const classes = useGraphStyles({});
  const [resizeListener, size] = useResizeAware();

  const [data] = useDataButton(() => createTree({ minDepth: 2, maxDepth: 4, maxChildren: 4 }));

  const links = useRef(null);
  const nodes = useRef(null);
  const guides = useRef(null);

  const layout = new TreeLayout();
  const projector = new TreeProjector();
  const guideProjector = new GuideProjector();
  const grid = useGrid(size);
  useLayout(layout, grid, data, () => {
    guideProjector.update(grid, layout.data, { group: guides.current });
    projector.update(grid, layout.data, {
      links: links.current,
      nodes: nodes.current
    });
  });

  // TODO(burdon): Create control for Tree (like Graph).
  return (
    <FullScreen>
      {resizeListener}
      <SVG width={size.width} height={size.height}>
        <g className={classes.root}>
          <g ref={guides} className={classes.guides} />
          <g ref={links} className={classes.links} />
          <g ref={nodes} className={classes.nodes} />
        </g>
      </SVG>
    </FullScreen>
  );
};

/**
 * Multiple layouts.
 */
export const Multiple = () => {
  const [resizeListener, size] = useResizeAware();
  const grid = useGrid(size);

  const nodeProjector = new NodeProjector({ transition: d3.transition, node: { showLabels: false } });

  const classes1 = useGraphStyles({});
  const classes2 = useGraphStyles({ color: 'blue' });
  const classes3 = useGraphStyles({ color: 'green' });

  const group1 = useRef(null);
  const group2 = useRef(null);
  const group3 = useRef(null);

  const [data1] = useState({ nodes: createItems(6) });
  const [data2] = useState({ nodes: createItems(12) });

  const layout1 = new RadialLayout({
    center: () => ({ x: grid.center.x + grid.scaleX(-60), y: grid.center.y + grid.scaleY(30) }),
    radius: () => grid.scaleX(10)
  });

  const layout2 = new RadialLayout({
    center: () => ({ x: grid.center.x + grid.scaleX(40), y: grid.center.y }),
    radius: () => grid.scaleX(40)
  });

  const layout3 = new RadialLayout({
    center: () => ({ x: grid.center.x + grid.scaleX(-20), y: grid.center.y }),
    radius: () => grid.scaleX(20)
  });

  // Share data set.
  useLayout(layout1, grid, data1, ({ layout }) => nodeProjector.update(grid, layout.data, { group: group1.current }));
  useLayout(layout2, grid, data2, ({ layout }) => nodeProjector.update(grid, layout.data, { group: group2.current }));
  useLayout(layout3, grid, data2, ({ layout }) => nodeProjector.update(grid, layout.data, { group: group3.current }));

  return (
    <FullScreen>
      {resizeListener}
      <SVG width={size.width} height={size.height}>
        <Grid grid={grid} showAxis={true} />
        <g ref={group1} className={classes1.nodes} />
        <g ref={group2} className={classes2.nodes} />
        <g ref={group3} className={classes3.nodes} />
      </SVG>
    </FullScreen>
  );
};

/**
 * Random layout.
 */
export const Random = () => {
  const classes = useGraphStyles({});
  const [resizeListener, size] = useResizeAware();
  const [data, setData, getData, updateData] = useObjectMutator(createGraph(16));
  const nodes = useRef(null);
  const snap = boolean('Snap', true);

  // TODO(burdon): Creates new grid on every data change.
  const grid = useGrid(size);

  const layout = new RandomLayout({
    radius: grid => Math.min(grid.size.width, grid.size.height),
    snap
  });

  const nodeProjector = new NodeProjector({ transition: d3.transition, node: { radius: 8 } });
  useLayout(layout, grid, data, () => {
    nodeProjector.update(grid, layout.data, { group: nodes.current });
  });

  // Generate data.
  useEffect(() => {
    setData(createGraph(16));

    const timer = d3.interval(() => {
      if (getData('nodes').length > 0) {
        updateData({
          // TODO(burdon): Remove links.
          nodes: {
            $splice: [
              [0, 1]
            ]
          }
        });
      } else {
        timer.stop();
      }
    }, 3000);

    return () => timer.stop();
  }, []);

  return (
    <FullScreen>
      {resizeListener}
      <SVG width={size.width} height={size.height}>
        <Grid grid={grid} />
        <g ref={nodes} className={classes.nodes} />
      </SVG>
    </FullScreen>
  );
};

/**
 * Radial layout.
 */
export const Radial = () => {
  const classes = useGraphStyles({});
  const [resizeListener, size] = useResizeAware();
  const [data, setData, getData, updateData] = useObjectMutator(undefined);
  const nodes = useRef(null);

  const grid = useGrid(size);

  const layout = new RadialLayout();
  const projector = new NodeProjector({ transition: d3.transition, node: { radius: 8 } });

  useEffect(() => {
    setData({
      nodes: createItems(5)
    });

    const timer = d3.interval(() => {
      if (getData('nodes').length > 0) {
        updateData({
          nodes: {
            $splice: [
              [0, 1]
            ]
          }
        });
      } else {
        timer.stop();
      }
    }, 1000);

    return () => timer.stop();
  }, []);

  useLayout(layout, grid, data, () => {
    projector.update(grid, layout.data, { group: nodes.current });
  });

  return (
    <FullScreen>
      {resizeListener}
      <SVG width={size.width} height={size.height}>
        <Grid grid={grid} />
        <g ref={nodes} className={classes.nodes} />
      </SVG>
    </FullScreen>
  );
};

/**
 * Changing layouts.
 */
export const Animation = () => {
  const [resizeListener, size] = useResizeAware();
  const nodes = useRef(null);

  const nodeProjector = new NodeProjector({ transition: d3.transition, node: { radius: 8 } });

  const layouts = [
    {
      classes: useGraphStyles({ color: 'blue' }),
      layout: new RadialLayout({ radius: 100 })
    },
    {
      classes: useGraphStyles({ color: 'green' }),
      layout: new RadialLayout({ radius: 200 })
    },
    {
      classes: useGraphStyles({ color: 'red' }),
      layout: new RadialLayout({ radius: 300 })
    },
    {
      classes: useGraphStyles({}),
      layout: new RandomLayout({ radius: 400, node: { radius: 8 } })
    },
    {
      classes: useGraphStyles({}),
      layout: new ForceLayout({ node: { radius: 16 }}),
      projector: new NodeProjector({ node: { radius: 8, showLabels: false }, fade: false })
    },
  ];

  const [layoutIndex, setLayout] = useState(0);
  const { classes, layout, projector = nodeProjector } = layouts[layoutIndex];

  //
  // Update data.
  //

  const { data, start, stop } = useGraphGenerator();
  useEffect(start, []);
  useEffect(() => {
    if (data.nodes.length > 24) {
      stop();
    }
  }, [data]);

  //
  // Update layout.
  //

  const grid = useGrid(size);

  useLayout(layout, grid, data, () => {
    projector.update(grid, layout.data, { group: nodes.current });
  });

  useEffect(() => {
    const interval = d3.interval(() => {
      if (layoutIndex === layouts.length - 1) {
        setLayout(0);
      } else {
        setLayout(layoutIndex + 1);
      }
    }, 3000);

    return () => {
      interval.stop();
    }
  }, [layoutIndex]);

  return (
    <FullScreen>
      {resizeListener}
      <SVG width={size.width} height={size.height}>
        <Grid grid={grid} />
        <g ref={nodes} className={classes.nodes} />
      </SVG>
    </FullScreen>
  );
};
