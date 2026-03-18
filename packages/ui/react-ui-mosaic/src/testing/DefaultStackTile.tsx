//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useRef, useState } from 'react';

import { Obj } from '@dxos/echo';
import { Card, Toolbar } from '@dxos/react-ui';
import { Menu, createMenuAction } from '@dxos/react-ui-menu';
import { Json } from '@dxos/react-ui-syntax-highlighter';

import { Mosaic, type MosaicStackTileComponent } from '../components';

export const DefaultStackTile: MosaicStackTileComponent<Obj.Any> = (props) => {
  const dragHandleRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const menuItems = useMemo(
    () => [
      createMenuAction('toggle-details', () => setOpen((prev) => !prev), {
        label: open ? 'Hide details' : 'Show details',
        icon: 'ph--placeholder--regular',
      }),
    ],
    [open],
  );

  return (
    <Mosaic.Tile {...props} asChild>
      <Card.Root>
        <Menu.Root>
          <Card.Toolbar>
            <Card.DragHandle ref={dragHandleRef} />
            <Card.Title>{Obj.getLabel(props.data) ?? props.data.id}</Card.Title>
            {/* TODO(wittjosiah): Reconcile with Card.Menu. */}
            <Menu.Trigger asChild disabled={!menuItems?.length}>
              <Toolbar.IconButton iconOnly variant='ghost' icon='ph--dots-three-vertical--regular' label='Menu' />
            </Menu.Trigger>
            <Menu.Content items={menuItems} />
          </Card.Toolbar>
        </Menu.Root>
        {open && (
          <Card.Row>
            <Json data={props.data} classNames='text-xs' />
          </Card.Row>
        )}
      </Card.Root>
    </Mosaic.Tile>
  );
};

DefaultStackTile.displayName = 'DefaultStackTile';
