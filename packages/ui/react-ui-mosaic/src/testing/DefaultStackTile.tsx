//
// Copyright 2026 DXOS.org
//

import React, { useRef, useState } from 'react';

import { Obj } from '@dxos/echo';
import { Json } from '@dxos/react-ui-syntax-highlighter';

import { Card, Mosaic, type StackTileComponent } from '../components';

export const DefaultStackTile: StackTileComponent<Obj.Any> = (props) => {
  const dragHandleRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <Mosaic.Tile {...props} className='border border-separator rounded-sm font-mono'>
      <Card.Toolbar>
        <Card.DragHandle ref={dragHandleRef} />
        <Card.Title>{Obj.getLabel(props.data) ?? props.data.id}</Card.Title>
        <Card.Menu
          items={[
            {
              label: open ? 'Hide details' : 'Show details',
              onClick: () => setOpen((open) => !open),
            },
          ]}
        />
      </Card.Toolbar>
      {open && (
        <Card.Row>
          <Json data={props.data} classNames='text-xs' />
        </Card.Row>
      )}
    </Mosaic.Tile>
  );
};

DefaultStackTile.displayName = 'DefaultStackTile';
