//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import faker from 'faker';
import React, { useEffect, useRef, useState } from 'react';
import useResizeAware from 'react-resize-aware';

import { button, number, withKnobs } from '@storybook/addon-knobs';
import { makeStyles } from '@material-ui/core/styles';
import * as colors from '@material-ui/core/colors';

import {
  NodeType,
  FullScreen,
  Grid,
  SVG,
  convertTreeToGraph,
  createGraph,
  createLink,
  createTree,
  seed,
  useGraphGenerator,
  useGrid
} from '@dxos/gem-core';

import {
  BulletLinkProjector,
  ForceLayout,
  Graph,
  GraphLinker,
  GridLayout,
  Markers,
  LinkProjector,
  NodeProjector,
  createSimulationDrag,
  useGraphStyles,
} from '../src';
import { useDataButton } from './util';

export default {
  title: 'Graph',
  decorators: [withKnobs]
};

const log = debug('dxos:spore:demo');
debug.enable('dxos:spore:*');

/**
 * Graph.
 */
export const Primary = () => {
  const [resizeListener, size] = useResizeAware();
  const grid = useGrid(size);
  const [data,,, updateData] = useDataButton(() => convertTreeToGraph(createTree({ minDepth: 1, maxDepth: 3 })));
  const [layout] = useState(() => new ForceLayout({ force: { links: { distance: 80 } } }));
  const [drag] = useState(() => createSimulationDrag(layout.simulation, { link: 'metaKey', freeze: 'shiftKey' }));
  const [{ nodeProjector, linkProjector }] = useState({
    nodeProjector: new NodeProjector({ node: { radius: 16, showLabels: false } }),
    linkProjector: new LinkProjector({ nodeRadius: 16, showArrows: true })
  });

  return (
    <FullScreen>
      {resizeListener}
      <SVG width={size.width} height={size.height}>
        <Grid grid={grid} showAxis={true} showGrid={true} />
        <Markers />

        <GraphLinker
          grid={grid}
          drag={drag}
          linkProjector={linkProjector}
          onUpdate={updateData}
        />

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
 * Force layout.
 */
export const Selection = () => {
  const [resizeListener, size] = useResizeAware();
  const grid = useGrid(size);

  const [layout] = useState(() => new ForceLayout());
  const [selected, setSelected] = useState();
  const [drag] = useState(() => createSimulationDrag(layout.simulation));
  useEffect(() => {
    drag.on('click', ({ source: selected }) => {
      log('Selected:', selected);
      setSelected(selected.id);
    });
  }, [drag]);

  const { data, generate } = useGraphGenerator({ data: convertTreeToGraph(createTree({ minDepth: 1, maxDepth: 3 }))} );
  button('Mutate', () => {
    generate();
  });

  return (
    <FullScreen>
      {resizeListener}
      <SVG width={size.width} height={size.height}>
        <Grid grid={grid} />
        <Graph
          grid={grid}
          data={data}
          selected={selected}
          layout={layout}
          drag={drag}
        />
      </SVG>
    </FullScreen>
  );
};

/**
 * Drag.
 */
export const Drag = () => {
  const [resizeListener, size] = useResizeAware();
  const grid = useGrid(size);

  const [data,,, updateData] = useDataButton(() => convertTreeToGraph(createTree({ minDepth: 1, maxDepth: 3 })));
  const [layout] = useState(() => new ForceLayout({ force: { links: { distance: 80 } } }));
  const [drag] = useState(() => createSimulationDrag(layout.simulation, { link: 'metaKey', freeze: 'shiftKey' }));
  const [{ nodeProjector, linkProjector }] = useState({
    nodeProjector: new NodeProjector({ node: { radius: 16, showLabels: false } }),
    linkProjector: new LinkProjector({ nodeRadius: 16, showArrows: true })
  });

  return (
    <FullScreen>
      {resizeListener}
      <SVG width={size.width} height={size.height}>
        <Grid grid={grid} />
        <Markers />

        <GraphLinker
          grid={grid}
          drag={drag}
          linkProjector={linkProjector}
          onUpdate={updateData}
        />

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
 * Arrows.
 */
export const Arrows = () => {
  const [resizeListener, size] = useResizeAware();
  const grid = useGrid(size);

  const [data] = useDataButton(() => convertTreeToGraph(createTree({ minDepth: 2, maxDepth: 4 })));
  const [layout] = useState(() => new ForceLayout());
  const [{ nodeProjector, linkProjector }] = useState({
    nodeProjector: new NodeProjector({ node: { radius: 16, showLabels: false } }),
    linkProjector: new LinkProjector({ nodeRadius: 16, showArrows: true })
  });

  return (
    <FullScreen>
      {resizeListener}
      <SVG width={size.width} height={size.height}>
        <Grid grid={grid} />
        <Markers arrowSize={16} />
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
 * Bullets.
 */
export const Bullets = () => {
  const classes = useGraphStyles({});
  const [resizeListener, size] = useResizeAware();
  const grid = useGrid(size);
  const guides = useRef(null);
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
      <SVG width={size.width} height={size.height}>
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

const nodeColors = ['red', 'green', 'blue'];
const useCustomStyles = makeStyles(() => ({
  nodes: nodeColors.reduce((map, color) => {
    map[`& g.node.${color} circle`] = {
      fill: colors[color][400],
      stroke: colors[color][700],
      strokeWidth: 4
    };

    map[`& g.node.${color} text`] = {
      fontFamily: 'sans-serif',
      fontSize: 12,
      fill: colors['grey'][700]
    };

    return map;
  }, {})
}));

/**
 * Custom nodes.
 */
export const CustomNodes = () => {
  const classes = useCustomStyles();
  const [resizeListener, size] = useResizeAware();
  const grid = useGrid(size);

  const [data,,, updateData] = useDataButton(() => convertTreeToGraph(createTree({ minDepth: 2, maxDepth: 4 })));
  const [layout] = useState(() => new ForceLayout({
    // TODO(burdon): Reconsile with propertyAdapter?
    initializer: (node, center) => {
      // Freeze first node.
      if (node.id === data.nodes[0].id) {
        return {
          fx: center.x,
          fy: center.y
        };
      }
    }
  }));
  const [drag] = useState(() => createSimulationDrag(layout.simulation, { link: 'metaKey', freeze: 'shiftKey' }));
  const [{ nodeProjector }] = useState({
    nodeProjector: new NodeProjector({
      node: {
        showLabels: true,
        propertyAdapter: (node) => {
          const i = Number('0x' + node.id.slice(0, 4)) % nodeColors.length;
          return {
            class: nodeColors[i],
            radius: node.children?.length > 2 ? 20 : 10
          };
        }
      }
    })
  });

  return (
    <FullScreen>
      {resizeListener}
      <SVG width={size.width} height={size.height}>
        <Grid grid={grid} />

        <GraphLinker
          grid={grid}
          drag={drag}
          onUpdate={updateData}
        />

        <Graph
          grid={grid}
          data={data}
          drag={drag}
          layout={layout}
          classes={{
            nodes: classes.nodes
          }}
          nodeProjector={nodeProjector}
        />
      </SVG>
    </FullScreen>
  );
};

/**
 * Force layout with cloned data.
 */
export const ClonedData = () => {
  const [resizeListener, size] = useResizeAware();
  const grid = useGrid(size);

  const generate = () => {
    seed(123); // Same seed:
    return convertTreeToGraph(createTree({ minDepth: 1, maxDepth: 3 }));
  };

  // TODO(burdon): Show Labels updating in real time.
  const [layout] = useState(new ForceLayout());
  const [data, setData] = useState(generate);
  useEffect(() => {
    const t = setTimeout(() => {
      log('Updating...');
      setData(generate());
    }, 2000);

    return () => clearTimeout(t);
  }, []);

  return (
    <FullScreen>
      {resizeListener}
      <SVG width={size.width} height={size.height}>
        <Graph
          grid={grid}
          data={data}
          layout={layout}
        />
      </SVG>
    </FullScreen>
  );
};

/**
 * Force layout.
 */
export const MultipleForceLayouts = () => {
  const n = number('graphs', 3, { min: 1, max: 4 });
  const [resizeListener, size] = useResizeAware();
  const grid = useGrid(size);

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
      };
    }));
  }, [n]);

  return (
    <FullScreen>
      {resizeListener}
      <SVG width={size.width} height={size.height}>
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
 * Muliple force layout.
 * TODO(burdon): Multiple focal points: https://bl.ocks.org/mbostock/1021841
 */
export const DoubleForceLayouts = () => {
  const [resizeListener, size] = useResizeAware();

  const [data1,, getData1, updateData1] =
    useDataButton(() => convertTreeToGraph(createTree({ minDepth: 2, maxDepth: 3 })), 'Left');
  const [data2,, getData2, updateData2] =
    useDataButton(() => convertTreeToGraph(createTree({ minDepth: 2, maxDepth: 4 })), 'Right');

  const grid = useGrid(size);
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
      const data1 = getData1();

      //
      // Find and remove node.
      //

      const idx = data1.nodes.findIndex(node => node.id === selected.id);

      const linkIndexes = [];
      data1.links.forEach(({ id: linkId, source, target }) => {
        if (source === selected.id || target === selected.id) {
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

      //
      // Add node to other graph.
      //

      const data2 = getData2();
      const target = faker.random.arrayElement<NodeType>(data2.nodes);

      updateData2({
        nodes: {
          $push: [
            selected
          ]
        },
        links: {
          $push: [
            createLink(selected, target)
          ]
        }
      });
    });
  }, [drag]);

  return (
    <FullScreen>
      {resizeListener}
      <SVG width={size.width} height={size.height}>
        <Grid grid={grid} showGrid={false} />

        <Graph
          grid={grid}
          data={data1}
          layout={layout1}
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
 * Dynamic layout.
 */
export const DynamicLayout = () => {
  const [resizeListener, size] = useResizeAware();
  const grid = useGrid(size);

  const [data] = useState(convertTreeToGraph(createTree({ minDepth: 1, maxDepth: 2 })));
  const [{ layout, drag }, setLayout] = useState({
    layout: new ForceLayout(),
    drag: undefined
  });

  // Update layout.
  useEffect(() => {
    const t = setTimeout(() => {
      const layout = new ForceLayout({
        center: {
          x: grid.scaleX(50),
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
      });
    }, 3000);

    return () => clearTimeout(t);
  }, [grid]);

  return (
    <FullScreen>
      {resizeListener}
      <SVG width={size.width} height={size.height}>
        <Grid grid={grid} />

        <Graph
          grid={grid}
          data={data}
          drag={drag}
          layout={layout}
        />
      </SVG>
    </FullScreen>
  );
};

/**
 * Grid layout.
 */
export const _GridLayout = () => {
  const [resizeListener, size] = useResizeAware();
  const grid = useGrid(size);

  const [data] = useDataButton(() => createGraph(faker.random.number(32), 8));
  const [layout] = useState(new GridLayout());
  const [selected, setSelected] = useState();
  const projector = new NodeProjector({ node: { radius: 8, showLabels: false }, fade: false });
  useEffect(() => {
    projector.on('click', ({ id }) => {
      setSelected(id);
    });
  }, [projector]);

  return (
    <FullScreen>
      {resizeListener}
      <SVG width={size.width} height={size.height}>
        <Grid grid={grid} showAxis={true} />
        <Graph
          grid={grid}
          data={data}
          selected={selected}
          layout={layout}
          nodeProjector={projector}
        />
      </SVG>
    </FullScreen>
  );
};
