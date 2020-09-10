//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import { Chance } from 'chance';
import debug from 'debug';
import faker from 'faker';
import React, { useEffect, useRef, useState } from 'react';
import useResizeAware from 'react-resize-aware';
import { withKnobs, boolean, button, number } from "@storybook/addon-knobs";
import { makeStyles } from '@material-ui/core/styles';
import * as colors from '@material-ui/core/colors';

import {
  FullScreen,
  Grid,
  SVG,

  createLinkId,
  createItem,
  createItems,
  createGraph,
  createTree,
  convertTreeToGraph,

  useGraphGenerator,
  useGrid,
  useObjectMutator
} from '@dxos/gem-core';

import {
  Graph,
  Markers,

  ForceLayout,
  GridLayout,
  RandomLayout,
  RadialLayout,
  TreeLayout,

  BoxProjector,
  BulletLinkProjector,
  GuideProjector,
  NodeProjector,
  LinkProjector,
  TreeProjector,

  useLayout,
  useGraphStyles,
  createSimulationDrag,
} from '../src';

export default {
  title: 'Demo',
  decorators: [withKnobs]
};

debug.enable('dxos:spore:*');

const chance = new Chance(1);

//
// Actions
//

const useDataButton = (generate, label='Refresh') => {
  const [data, setData, getData, updateData] = useObjectMutator(generate());
  button(label, () => setData(generate()));
  return [data, setData, getData, updateData];
};

/**
 * Grid component.
 */
export const withGrid = () => {
  const [resizeListener, size] = useResizeAware();
  const grid = useGrid(size);
  const { width, height } = size;

  return (
    <FullScreen>
      {resizeListener}
      <SVG width={width} height={height}>
        <Grid grid={grid} showAxis={true} showGrid={true} />
      </SVG>
    </FullScreen>
  );
};

/**
 * Box projector.
 */
export const withBoxProjector = () => {
  const classes = useGraphStyles();
  const [resizeListener, size] = useResizeAware();
  const { width, height } = size;
  const grid = useGrid({ width, height, zoom: 1 });

  const [data] = useDataButton(() => createGraph(faker.random.number(32), 8));

  const nodes = useRef();
  const layout = new GridLayout();
  const projector = new BoxProjector();
  useLayout(layout, grid, data, ({ data }) => {
    projector.update(grid, data, { group: nodes.current });
  });

  return (
    <FullScreen>
      {resizeListener}
      <SVG width={width} height={height}>
        <Grid grid={grid} showAxis={true} tickFormat="" />
        <g ref={nodes} className={classes.nodes} />
      </SVG>
    </FullScreen>
  );
};

/**
 * Grid layout.
 */
export const withGridLayout = () => {
  const [resizeListener, size] = useResizeAware();
  const { width, height } = size;
  const grid = useGrid({ width, height, zoom: 1 });

  const [data] = useDataButton(() => createGraph(faker.random.number(32), 8));
  const [selected, setSelected] = useState();

  const layout = new GridLayout();
  const projector = new NodeProjector({ node: { radius: 8, showLabels: false }, fade: false });
  useEffect(() => {
    projector.on('click', ({ id }) => {
      setSelected(id);
    });
  }, [projector]);

  return (
    <FullScreen>
      {resizeListener}
      <SVG width={width} height={height}>
        <Grid grid={grid} showAxis={true} tickFormat="" />
        <Graph
          grid={grid}
          data={data}
          layout={layout}
          nodeProjector={projector}
          selected={selected}
        />
      </SVG>
    </FullScreen>
  );
};

/**
 * Force layout.
 */
export const withForceLayout = () => {
  const [resizeListener, size] = useResizeAware();
  const { width, height } = size;
  const grid = useGrid({ width, height });

  const [data] = useDataButton(() => convertTreeToGraph(createTree({ minDepth: 1, maxDepth: 3 })));
  const [selected, setSelected] = useState();
  const [layout] = useState(() => new ForceLayout());
  const [drag] = useState(() => createSimulationDrag(layout.simulation));
  useEffect(() => {
    drag.on('click', ({ source: { id } }) => {
      setSelected(id);
    });
  }, [drag]);

  return (
    <FullScreen>
      {resizeListener}
      <SVG width={width} height={height}>
        <Grid grid={grid} />
        <Graph
          grid={grid}
          data={data}
          layout={layout}
          selected={selected}
          drag={drag}
        />
      </SVG>
    </FullScreen>
  );
};

/**
 * Force layout.
 */
export const withMultipleForceLayout = () => {
  const n = number('graphs', 1, { min: 1, max: 4 });
  const [resizeListener, size] = useResizeAware();
  const { width, height } = size;
  const grid = useGrid({ width, height });

  const [agents, setAgents] = useState([]);
  useEffect(() => {
    const r = 120;
    setAgents([...new Array(n)].map((_, i) => {
      const layout = new ForceLayout({
        center: {
          x: (i - (n - 1) / 2) * (r * 2.5), y: 0
        },
        force: {
          radial: {
            radius: r
          }
        }
      });

      return {
        data: convertTreeToGraph(createTree({ minDepth: 1, maxDepth: 2 })),
        drag: createSimulationDrag(layout.simulation),
        layout
      }
    }));
  }, [n]);

  console.log(agents);

  return (
    <FullScreen>
      {resizeListener}
      <SVG width={width} height={height}>
        {agents.map(({ data, layout, drag }, i) => (
          <Graph
            key={i}
            grid={grid}
            data={data}
            layout={layout}
            drag={drag}
          />
        ))}
      </SVG>
    </FullScreen>
  );
};

/**
 * Force layout.
 */
export const withChangingForceLayout = () => {
  const [resizeListener, size] = useResizeAware();
  const { width, height } = size;
  const grid = useGrid({ width, height });

  const [data] = useState(convertTreeToGraph(createTree({ minDepth: 1, maxDepth: 2 })));

  const [{ layout, drag }, setLayout] = useState(() => {
    const layout = new ForceLayout({ center: { x: -200, y: 0 }, force: { links: { distance: 100 }}});
    return {
      layout,
      drag: createSimulationDrag(layout.simulation)
    };
  });

  useEffect(() => {
    setTimeout(() => {
      const layout = new ForceLayout({
        center: {
          x: 200,
          y: 0
        },
        force: {
          links: {
            distance: 20
          },
          radial: {
            radius: 100
          }
        }
      });

      setLayout({
        layout,
        drag: createSimulationDrag(layout.simulation)
      })
    }, 2000);
  }, []);

  return (
    <FullScreen>
      {resizeListener}
      <SVG width={width} height={height}>
        <Grid grid={grid} />
        <Graph
          grid={grid}
          data={data}
          layout={layout}
          drag={drag}
        />
      </SVG>
    </FullScreen>
  );
};

/**
 * Arrows.
 */
export const withArrows = () => {
  const [resizeListener, size] = useResizeAware();
  const { width, height } = size;
  const grid = useGrid({ width, height });

  const [data] = useDataButton(() => convertTreeToGraph(createTree({ minDepth: 2, maxDepth: 4 })));
  const [layout] = useState(() => new ForceLayout());
  const [{ nodeProjector, linkProjector }] = useState({
    nodeProjector: new NodeProjector({ node: { radius: 16, showLabels: false } }),
    linkProjector: new LinkProjector({ nodeRadius: 16, showArrows: true })
  });

  return (
    <FullScreen>
      {resizeListener}
      <SVG width={width} height={height}>
        <Grid grid={grid} />
        <Markers />
        <Graph
          grid={grid}
          data={data}
          layout={layout}
          nodeProjector={nodeProjector}
          linkProjector={linkProjector}
        />
      </SVG>
    </FullScreen>
  );
};

const nodeColors = ['red', 'green', 'blue'];
const useCustomStyles = makeStyles(() => ({
  nodes: nodeColors.reduce((map, color) => {
    map[`& g.node.${color} circle`] = { fill: colors[color][400] };
    return map;
  }, {})
}));

/**
 * Custom nodes.
 */
export const withCustomNodes = () => {
  const classes = useCustomStyles();
  const [resizeListener, size] = useResizeAware();
  const { width, height } = size;
  const grid = useGrid({ width, height });

  const [data] = useDataButton(() => convertTreeToGraph(createTree({ minDepth: 2, maxDepth: 4 })));
  const [layout] = useState(() => new ForceLayout());
  const [{ nodeProjector, linkProjector }] = useState({
    nodeProjector: new NodeProjector({
      node: {
        showLabels: true,
        propertyAdapter: (d) => ({
          class: chance.pickone(nodeColors),
          radius: d.children?.length > 2 ? 20 : 10
        })
      }
    })
  });

  return (
    <FullScreen>
      {resizeListener}
      <SVG width={width} height={height}>
        <Grid grid={grid} />
        <Graph
          grid={grid}
          data={data}
          layout={layout}
          classes={{
            nodes: classes.nodes
          }}
          nodeProjector={nodeProjector}
          linkProjector={linkProjector}
        />
      </SVG>
    </FullScreen>
  );
};

/**
 * Bullets.
 */
export const withBullet = () => {
  const classes = useGraphStyles();
  const [resizeListener, size] = useResizeAware();
  const { width, height } = size;
  const grid = useGrid({ width, height });
  const guides = useRef();

  const [data] = useDataButton(() => convertTreeToGraph(createTree({ minDepth: 2, maxDepth: 4 })));
  const [layout] = useState(() => new ForceLayout());

  const [{ nodeProjector, linkProjector }] = useState(() => {
    return {
      nodeProjector: new NodeProjector({ node: { radius: 8, showLabels: false } }),
      linkProjector: new BulletLinkProjector(new LinkProjector({ nodeRadius: 8, showArrows: true }))
    };
  });

  useEffect(() => {
    nodeProjector.on('click', ({ id }) => {
      linkProjector.fire(guides.current, id);
    });
  }, [nodeProjector]);

  return (
    <FullScreen>
      {resizeListener}
      <SVG width={width} height={height}>
        <Grid grid={grid} />
        <Markers />

        <g ref={guides} className={classes.guides} />

        <Graph
          grid={grid}
          data={data}
          layout={layout}
          nodeProjector={nodeProjector}
          linkProjector={linkProjector}
        />
      </SVG>
    </FullScreen>
  );
};

/**
 * Drag.
 */
export const withDrag = () => {
  const classes = useGraphStyles();
  const [resizeListener, size] = useResizeAware();
  const { width, height } = size;
  const grid = useGrid({ width, height });
  const guides = useRef();

  const [data,,, updateData] = useDataButton(() => convertTreeToGraph(createTree({ minDepth: 2, maxDepth: 4 })));
  const [layout] = useState(() => new ForceLayout({ force: { links: { distance: 80 } } }));

  const [{ nodeProjector, linkProjector }] = useState({
    nodeProjector: new NodeProjector({ node: { radius: 16, showLabels: false } }),
    linkProjector: new LinkProjector({ nodeRadius: 16, showArrows: true })
  });

  // TODO(burdon): Factor out (move to Graph).
  const [drag] = useState(() => createSimulationDrag(layout.simulation, { link: 'metaKey', freeze: 'shiftKey' }));
  useEffect(() => {
    drag.on('drag', ({ source, position, linking }) => {
      if (!linking) {
        return;
      }

      const data = {
        links: [
          { id: 'guide-link', source, target: { id: 'guide-link-target', ...position, radius: 0 } },
        ]
      };

      // Draw line.
      linkProjector.update(grid, data, { group: guides.current });
    });

    drag.on('end', ({ source, target, linking }) => {
      if (!linking) {
        return;
      }

      linkProjector.update(grid, {}, { group: guides.current });

      if (target) {
        // TODO(burdon): Highlight source node.
        // TODO(burdon): End marker for guide link.
        // TODO(burdon): Escape to cancel.
        // TODO(burdon): Check not already linked (util).
        // TODO(burdon): Delete.
        // TODO(burdon): New node spawned from parent location.
        updateData({
          links: {
            $push: [{ id: createLinkId(source.id, target.id), source, target }]
          }
        });
      } else {
        const target = createItem();
        updateData({
          nodes: {
            $push: [target]
          },
          links: {
            $push: [{ id: createLinkId(source.id, target.id), source, target }]
          }
        });
      }
    });

    drag.on('click', ({ source: { id } }) => {
      console.log('click', id);
    });
  }, [drag]);

  return (
    <FullScreen>
      {resizeListener}
      <SVG width={width} height={height}>
        <Grid grid={grid} />
        <Markers />

        <g ref={guides} className={classes.links} />

        <Graph
          grid={grid}
          data={data}
          layout={layout}
          linkProjector={linkProjector}
          nodeProjector={nodeProjector}
          drag={drag}
        />
      </SVG>
    </FullScreen>
  );
};

/**
 * Muliple force layout.
 *
 * TODO(burdon): Multiple focal points: https://bl.ocks.org/mbostock/1021841
 */
export const withTwoForceLayouts = () => {
  const [resizeListener, size] = useResizeAware();
  const { width, height } = size;

  const [selected, setSelected] = useState();
  const [data1,, getData1, updateData1] =
    useDataButton(() => convertTreeToGraph(createTree({ minDepth: 2, maxDepth: 3 })), 'Left');
  const [data2,, getData2, updateData2] =
    useDataButton(() => convertTreeToGraph(createTree({ minDepth: 2, maxDepth: 4 })), 'Right');

  const grid = useGrid({ width, height });
  const [layout1] = useState(() => new ForceLayout({
    center: grid => ({ x: grid.center.x - grid.scaleX(50), y: grid.center.y }),
  }));
  const [layout2] = useState(() => new ForceLayout({
    center: grid => ({ x: grid.center.x + grid.scaleX(50), y: grid.center.y }),
    force: { radial: { radius: 100 } }
  }));

  const [nodeProjector] = useState(() => new NodeProjector({ node: { showLabels: false } }));
  const [drag] = useState(createSimulationDrag(layout1.simulation));

  // Move node from one group to the other.
  useEffect(() => {
    drag.on('click', ({ source: selected }) => {
      setSelected(selected.id);

      const data1 = getData1();
      const idx = data1.nodes.findIndex(node => node.id === selected.id);

      const linkIndexes = [];
      data1.links.forEach(({ id: linkId, source, target }) => {
        if (source.id === selected.id || target.id === selected.id) {
          linkIndexes.push(data1.links.findIndex(link => link.id === linkId));
        }
      });

      updateData1({
        nodes: {
          $splice: [
            [idx, 1]
          ]
        },
        links: {
          // NOTE: Have to change index when removing previous nodes.
          $splice: linkIndexes.map((idx, i) => [idx - i, 1])
        }
      });

      const data2 = getData2();
      const target = faker.random.arrayElement(data2.nodes);

      updateData2({
        nodes: {
          $push: [
            selected
          ]
        },
        links: {
          $push: [
            {
              id: createLinkId(selected.id, target.id),
              source: selected.id,
              target: target.id
            }
          ]
        }
      });
    });
  }, [drag]);

  return (
    <FullScreen>
      {resizeListener}
      <SVG width={width} height={height}>
        <Grid grid={grid} showGrid={false} />
        <Graph
          grid={grid}
          data={data1}
          layout={layout1}
          selected={selected}
          drag={drag}
        />
        <Graph
          grid={grid}
          data={data2}
          layout={layout2}
          nodeProjector={nodeProjector}
        />
      </SVG>
    </FullScreen>
  );
};

/**
 * Tree layout.
 */
export const withTreeLayout = () => {
  const classes = useGraphStyles();
  const [resizeListener, size] = useResizeAware();
  const { width, height } = size;

  const [data] = useDataButton(() => createTree({ minDepth: 2, maxDepth: 4, maxChildren: 2 }));

  const links = useRef();
  const nodes = useRef();
  const guides = useRef();

  const layout = new TreeLayout();
  const projector = new TreeProjector();
  const guideProjector = new GuideProjector();
  const grid = useGrid({ width, height });
  useLayout(layout, grid, data, ({ context, data }) => {
    guideProjector.update(grid, context, { group: guides.current });
    projector.update(grid, data, {
      links: links.current,
      nodes: nodes.current
    });
  });

  // TODO(burdon): Create control for Tree (like Graph).
  return (
    <FullScreen>
      {resizeListener}
      <SVG width={width} height={height}>
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
 * Random layout.
 */
export const withRandomLayout = () => {
  const classes = useGraphStyles();
  const [resizeListener, size] = useResizeAware();
  const [data, setData, getData, updateData] = useObjectMutator(createGraph(16));
  const nodes = useRef();
  const snap = boolean('Snap', true);

  // TODO(burdon): Creates new grid on every data change.
  const { width, height } = size;
  const grid = useGrid({ width, height });

  const layout = new RandomLayout({
    radius: grid => Math.min(grid.size.width, grid.size.height),
    snap
  });

  const nodeProjector = new NodeProjector({ transition: d3.transition, node: { radius: 8 } });
  useLayout(layout, grid, data, ({ data }) => {
    nodeProjector.update(grid, data, { group: nodes.current });
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
      <SVG width={width} height={height}>
        <Grid grid={grid} />
        <g ref={nodes} className={classes.nodes} />
      </SVG>
    </FullScreen>
  );
};

/**
 * Radial layout.
 */
export const withRadialLayout = () => {
  const classes = useGraphStyles();
  const [resizeListener, size] = useResizeAware();
  const [data, setData, getData, updateData] = useObjectMutator({ nodes: [] });
  const nodes = useRef();

  const { width, height } = size;
  const grid = useGrid({ width, height });

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

  useLayout(layout, grid, data, ({ data }) => {
    projector.update(grid, data, { group: nodes.current });
  });

  return (
    <FullScreen>
      {resizeListener}
      <SVG width={width} height={height}>
        <Grid grid={grid} />
        <g ref={nodes} className={classes.nodes} />
      </SVG>
    </FullScreen>
  );
};

/**
 * Multiple layouts.
 */
export const withMultipleLayouts = () => {
  const [resizeListener, size] = useResizeAware();
  const grid = useGrid(size);

  const nodeProjector = new NodeProjector({ transition: d3.transition, node: { showLabels: false } });

  const classes1 = useGraphStyles();
  const classes2 = useGraphStyles({ color: 'blue' });
  const classes3 = useGraphStyles({ color: 'green' });

  const group1 = useRef();
  const group2 = useRef();
  const group3 = useRef();

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
  useLayout(layout1, grid, data1, ({ data }) => nodeProjector.update(grid, data, { group: group1.current }));
  useLayout(layout2, grid, data2, ({ data }) => nodeProjector.update(grid, data, { group: group2.current }));
  useLayout(layout3, grid, data2, ({ data }) => nodeProjector.update(grid, data, { group: group3.current }));

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
 * Changing layouts.
 */
export const withChangingLayout = () => {
  const [resizeListener, size] = useResizeAware();
  const nodes = useRef();

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
      classes: useGraphStyles(),
      layout: new RandomLayout({ radius: 400, node: { radius: 8 } })
    },
    {
      classes: useGraphStyles(),
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

  const { width, height } = size;
  const grid = useGrid({ width, height });

  useLayout(layout, grid, data, ({ data }) => {
    projector.update(grid, data, { group: nodes.current });
  });

  useEffect(() => {
    const interval = d3.interval(() => {
      if (layoutIndex === layouts.length - 1) {
        setLayout(0);
      } else {
        setLayout(layoutIndex + 1);
      }
    }, 3000);

    return () => interval.stop();
  }, [layoutIndex]);

  return (
    <FullScreen>
      {resizeListener}
      <SVG width={width} height={height}>
        <Grid grid={grid} />
        <g ref={nodes} className={classes.nodes} />
      </SVG>
    </FullScreen>
  );
};
