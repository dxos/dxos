//
// Copyright 2020 DXOS.org
//

// @ts-ignore
import React, { useEffect, useRef, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import * as colors from '@material-ui/core/colors';
import { jsonReplacer } from '@dxos/experimental-util';

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
  }
}));

/**
 * @param id
 * @param grid
 * @param dx
 * @param onSelect
 * @constructor
 */
const EchoGraph = (
  { id, grid, dx, onSelect }: { id: string, grid: any, dx: number, onSelect: Function }
) => {
  const classes = useGraphStyles();
  const customClasses = useCustomStyles();
  const guides = useRef();

  const database = useDatabase();

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

  const [layout] = useState(new ForceLayout({
    center: (grid: any) => ({ x: grid.center.x + grid.scaleX(dx), y: grid.center.y }),
    force: { links: { distance: 80 }, radial: { radius: 250 } }
  }));

  const [selected, setSelected] = useState();
  const [drag] = useState(() => createSimulationDrag(layout.simulation, { link: 'metaKey' }));
  useEffect(() => {
    // TODO(burdon): Click to open.
    // TODO(burdon): Drag to invite?
    drag.on('click', ({ source }) => {
      setSelected(source.id);
      onSelect && onSelect(source);
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

      linkProjector.update(grid, data, { group: guides.current });
    });

    drag.on('end', ({ source, target, linking }) => {
      if (!linking) {
        return;
      }

      setImmediate(async () => {
        switch (source.type) {
          case 'database': {
            await database.createParty();
            break;
          }

          case 'party': {
            const party = await database.getParty(source.partyKey);
            await party.createItem(ObjectModel.meta.type);
            break;
          }

          case 'item': {
            console.log('### CHILD ITEM ###');
            break;
          }
        }
      });

      linkProjector.update(grid, {}, { group: guides.current });
    });
  }, [drag]);

  return (
    <g>
      <g ref={guides} className={classes.links} />

      <Graph
        grid={grid}
        data={data}
        layout={layout}
        classes={{
          nodes: customClasses.nodes
        }}
        linkProjector={linkProjector}
        nodeProjector={nodeProjector}
        drag={drag}
      />
    </g>
  );
};

export default EchoGraph;
