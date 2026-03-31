//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useRef, useState } from 'react';

import { Obj } from '@dxos/echo';
import { Card, Toolbar } from '@dxos/react-ui';
import { Menu, createMenuAction } from '@dxos/react-ui-menu';
import { Json } from '@dxos/react-ui-syntax-highlighter';

import { Focus, Mosaic, type MosaicStackTileComponent } from '../components';

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
    <Menu.Root>
      <Mosaic.Tile {...props} asChild>
        <Focus.Item asChild>
          <Card.Root className='dx-current dx-hover'>
            <Card.Toolbar>
              <Card.DragHandle ref={dragHandleRef} />
              <Card.Title>{Obj.getLabel(props.data) ?? props.data.id}</Card.Title>
              <Menu.Trigger asChild disabled={!menuItems?.length}>
                <Toolbar.IconButton iconOnly variant='ghost' icon='ph--dots-three-vertical--regular' label='Menu' />
              </Menu.Trigger>
              <Menu.Content items={menuItems} />
            </Card.Toolbar>
            {open && (
              <Card.Row>
                <Json data={props.data} classNames='text-xs' />
              </Card.Row>
            )}
          </Card.Root>
        </Focus.Item>
      </Mosaic.Tile>
    </Menu.Root>
  );
};

DefaultStackTile.displayName = 'DefaultStackTile';
