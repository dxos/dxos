//
// Copyright 2020 DXOS.org
//

// @ts-ignore
import React, { useEffect, useRef, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import * as colors from '@material-ui/core/colors';

import {
  createSimulationDrag,
  useGraphStyles,
  Graph,
  ForceLayout,
  LinkProjector,
  NodeProjector,
// @ts-ignore
} from '@dxos/gem-spore';

import { ObjectModel } from '@dxos/experimental-object-model';

import { useDatabase, useGraphData } from '../hooks';

// TODO(burdon): Merge styles.
const useCustomStyles = makeStyles(() => ({
  nodes: {
    '& g.node.database circle': {
      fill: colors['blue'][400]
    },
    '& g.node.party circle': {
      fill: colors['red'][400]
    },
    '& g.node.item circle': {
      fill: colors['grey'][400]
    },
    '& g.node text': {
      fontFamily: 'sans-serif',
      fontWeight: 100
    },
  }
}));

const createLayout = ({ database, grid, guides, delta, linkProjector, handleSelect }) => {
  const layout = new ForceLayout({
    center: {
      x: grid.center.x + delta.x,
      y: grid.center.y + delta.y,
    },
    initializer: (d, center) => {
      const { type } = d;
      if (type === 'database') {
        return {
          fx: center.x,
          fy: center.y
        }
      }
    },
    force: {
      center: {
        strength: 0
      },
      radial: {
        radius: 200,
        strength: 0.5
      },
      links: {
        distance: 30
      },
      charge: {
        strength: -300
      },
      collide: {
        strength: 0.1
      }
    }
  });

  const drag = createSimulationDrag(layout.simulation, { link: 'metaKey' });

  drag.on('click', ({ source }) => {
    handleSelect(source);
  });

  drag.on('drag', ({ source, position, linking }) => {
    if (!linking) {
      return;
    }

    const data = {
      links: [
        { id: 'guide-link', source, target: { id: 'guide-link-target', ...position } },
      ]
    };

    linkProjector.update(grid, data, { group: guides });
  });

  drag.on('end', ({ source, target, linking }) => {
    if (!linking) {
      return;
    }

    console.log({ source, target });
    setImmediate(async () => {
      switch (source.type) {
        case 'database': {
          await database.createParty();
          break;
        }

        case 'party': {
          const party = await database.getParty(source.partyKey);
          await party.createItem(ObjectModel);
          break;
        }

        case 'item': {
          // TODO(burdon): Change parent if target specified.
          const party = await database.getParty(source.partyKey);
          const child = await party.createItem(ObjectModel);
          await child.setParent(source.id);
          break;
        }
      }
    });

    linkProjector.update(grid, {}, { group: guides });
  });

  return {
    layout,
    drag
  }
};

/**
 * @param id
 * @param grid
 * @param delta
 * @param radius
 * @param onSelect
 * @constructor
 */
const EchoGraph = (
  {
    id, grid, delta, radius = 250, onSelect
  }: {
    id: string, grid: any, delta: { x: number, y: number }, radius: number, onSelect: Function
  }
) => {
  const classes = useGraphStyles();
  const customClasses = useCustomStyles();
  const guides = useRef();

  const data = useGraphData({ id });

  const [{ nodeProjector, linkProjector }] = useState({
    nodeProjector: new NodeProjector({
      node: {
        radius: 16,
        showLabels: true,
        // TODO(burdon): Properties on node directly (e.g., radius, class). Arrows use radius.
        propertyAdapter: ({ type  }) => ({
          class: type,
          radius: {
            database: 20,
            party: 15,
            item: 10
          }[type]
        })
      }
    }),
    linkProjector: new LinkProjector({ nodeRadius: 16, showArrows: true })
  });

  const handleSelect = source => {
    setSelected(source.id);
    onSelect && onSelect(source);
  };

  const database = useDatabase();
  const [selected, setSelected] = useState();
  const [{ layout, drag }, setLayout] = useState(() => createLayout({
    database, delta, grid, guides: guides.current, linkProjector, handleSelect
  }));

  useEffect(() => {
    setLayout(createLayout({
      database, delta, grid, guides: guides.current, linkProjector, handleSelect
    }));
  }, [delta]);

  return (
    <g>
      <g ref={guides} className={classes.links} />

      <Graph
        grid={grid}
        data={data}
        layout={layout}
        drag={drag}
        linkProjector={linkProjector}
        nodeProjector={nodeProjector}
        classes={{
          nodes: customClasses.nodes
        }}
      />
    </g>
  );
};

export default EchoGraph;
