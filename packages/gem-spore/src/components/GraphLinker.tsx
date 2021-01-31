//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useRef } from 'react';

import { createItem, createLink, GridProperties } from '@dxos/gem-core';

import { LinkProjector } from '../projector';
import { useGraphStyles } from './Graph';

interface GraphLinkerProperties {
  grid: GridProperties;
  drag: any; // TODO(burdon): Type.
  linkProjector?: LinkProjector;
  onSelect?: Function;
  onUpdate?: Function;
}

/**
 * Util to create links by dragging.
 */
export const GraphLinker = (props: GraphLinkerProperties) => {
  const { grid, drag, linkProjector = new LinkProjector(), onSelect, onUpdate } = props;

  const classes = useGraphStyles({});
  const guides = useRef(null);

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
            $push: [createLink(source, target)]
          },
        });
      } else {
        const target = createItem();
        onUpdate({
          nodes: {
            $push: [target]
          },
          links: {
            $push: [createLink(source, target)]
          },
        });
      }
    });

    drag.on('click', ({ source: { id } }) => {
      onSelect && onSelect(id);
    });
  }, [drag]);

  return (
    <g ref={guides} className={classes.links}/>
  );
};

export default GraphLinker;
