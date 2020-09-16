//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useRef } from 'react';

import { createItem, createLinkId } from '@dxos/gem-core';

import { useGraphStyles } from './index';

/**
 * @param grid
 * @param drag
 * @param linkProjector
 * @param onUpdate
 * @returns {JSX.Element}
 * @constructor
 */
export const GraphLinker = ({ grid, drag, linkProjector, onUpdate }) => {
  const classes = useGraphStyles();
  const guides = useRef();

  useEffect(() => {
    drag.on('drag', ({ source, position, linking }) => {
      if (!linking) {
        return;
      }

      const data = {
        links: [
          {
            id: 'guide-link',
            source,
            target: {
              id: 'guide-link-target',
              radius: 0,
              x: position.x,
              y: position.y,
            },
          },
        ],
      };

      // Draw line.
      linkProjector.update(grid, data, { group: guides.current });
    });

    drag.on('end', ({ source, target, linking }) => {
      if (!linking) {
        return;
      }

      linkProjector.update(grid, {}, { group: guides.current });

      // TODO(burdon): Highlight source node.
      // TODO(burdon): End marker for guide link.
      // TODO(burdon): Escape to cancel.
      // TODO(burdon): Check not already linked (util).
      // TODO(burdon): Delete.
      // TODO(burdon): New node spawned from parent location.
      if (target) {
        onUpdate({
          links: {
            $push: [{ id: createLinkId(source.id, target.id), source, target }],
          },
        });
      } else {
        const target = createItem();
        onUpdate({
          nodes: {
            $push: [target],
          },
          links: {
            $push: [{ id: createLinkId(source.id, target.id), source, target }],
          },
        });
      }
    });

    drag.on('click', ({ source: { id } }) => {
      console.log('click', id);
    });
  }, [drag]);

  return (
    <g ref={guides} className={classes.links}/>
  );
};

export default GraphLinker;
