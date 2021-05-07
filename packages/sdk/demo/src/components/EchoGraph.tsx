//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useRef, useState } from 'react';

import * as colors from '@material-ui/core/colors';
import { makeStyles } from '@material-ui/core/styles';

import { ECHO, Item } from '@dxos/echo-db';
import {
  createSimulationDrag,
  useGraphStyles,
  Graph,
  ForceLayout,
  LinkProjector,
  NodeProjector
} from '@dxos/gem-spore';
import { ObjectModel } from '@dxos/object-model';

import { useGraphData } from '../hooks';
import { useClient } from '@dxos/react-client';

// TODO(burdon): Merge styles.
const useCustomStyles = makeStyles(() => ({
  nodes: {
    '& g.node.database circle': {
      fill: colors.blue[400]
    },
    '& g.node.party circle': {
      fill: colors.red[400]
    },
    '& g.node.item circle': {
      fill: colors.grey[400]
    },
    '& g.node text': {
      fontFamily: 'sans-serif',
      fontWeight: 100
    }
  }
}));

interface CreateLayoutOpts {
  echo: ECHO
  grid: any,
  guides: any
  delta: any
  linkProjector: any
  handleSelect: any
}

const createLayout = ({ echo, grid, guides, delta, linkProjector, handleSelect }: CreateLayoutOpts) => {
  const layout = new ForceLayout({
    center: {
      x: grid.center.x + delta.x,
      y: grid.center.y + delta.y
    },
    initializer: (d: Item<any>, center: any) => {
      const { type } = d;
      if (type === 'database') {
        return {
          fx: center.x,
          fy: center.y
        };
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

  drag.on('click', ({ source }: any) => {
    handleSelect(source);
  });

  drag.on('drag', ({ source, position, linking }: any) => {
    if (!linking) {
      return;
    }

    const data = {
      links: [
        { id: 'guide-link', source, target: { id: 'guide-link-target', ...position } }
      ]
    };

    linkProjector.update(grid, data, { group: guides });
  });

  drag.on('end', ({ source, linking }: any) => {
    if (!linking) {
      return;
    }

    setImmediate(async () => {
      switch (source.type) {
        case 'database': {
          await echo.createParty();
          break;
        }

        case 'party': {
          const party = await echo.getParty(source.partyKey);
          if (!party) {
            console.warn(`Attempted to create item for a party "${source.partyKey.toHex()}" that has not been found`);
          }
          await party?.database.createItem({ model: ObjectModel });
          break;
        }

        case 'item': {
          const party = await echo.getParty(source.partyKey);
          if (!party) {
            console.warn(`Attempted to create item for a party "${source.partyKey.toHex()}" that has not been found`);
          }
          await party?.database.createItem({ model: ObjectModel, parent: source.id });
          break;
        }
      }
    });

    linkProjector.update(grid, {}, { group: guides });
  });

  return {
    layout,
    drag
  };
};

/**
 * @param id
 * @param grid
 * @param [delta]
 * @param [radius]
 * @param [onSelect]
 * @constructor
 */
const EchoGraph = (
  {
    id, grid, delta = { x: 0, y: 0 }, onSelect = () => {}
  }: {
    id: string,
    grid: any,
    delta?: { x: number, y: number },
    radius?: number,
    onSelect?: Function
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
        propertyAdapter: ({ type }: {type: 'database' | 'party' | 'item'}) => ({
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

  const handleSelect = (source: any) => {
    setSelected(source.id);
    onSelect && onSelect(source);
  };

  const { echo } = useClient();
  const [, setSelected] = useState();
  const [{ layout, drag }, setLayout] = useState(() => createLayout({
    echo, delta, grid, guides: guides.current, linkProjector, handleSelect
  }));

  useEffect(() => {
    setLayout(createLayout({
      echo, delta, grid, guides: guides.current, linkProjector, handleSelect
    }));
  }, [delta.x, delta.y]);

  return (
    <g>
      <g ref={guides as any} className={classes.links} />

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
