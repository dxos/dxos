//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useRef, useState } from 'react';

import { Obj } from '@dxos/echo';
import { Card, IconButton } from '@dxos/react-ui';
import { Menu, createMenuAction } from '@dxos/react-ui-menu';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';

import { Focus, Mosaic, type MosaicStackTileComponent } from '../components';

export const DefaultStackTile: MosaicStackTileComponent<Obj.Any> = (props) => {
  const dragHandleRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const menuItems = useMemo(
    () => [
      createMenuAction('toggle-details', () => setOpen((prev) => !prev), {
        label: open ? 'Hide details' : 'Show details',
        icon: 'ph--circle-dashed--regular',
      }),
    ],
    [open],
  );

  return (
    <Menu.Root>
      {/*
       * `Mosaic.Tile` sets `aria-current` from `props.current`, which the
       * Slot composition propagates down to `Card.Root`'s div. That's what
       * makes `dx-current` (an `aria-[current=true]:` utility) actually
       * fire here. See `ui-theme/src/css/components/selected.md`.
       */}
      <Mosaic.Tile {...props} asChild>
        <Focus.Item asChild>
          <Card.Root className='dx-current dx-hover'>
            <Card.Header>
              <Card.DragHandle ref={dragHandleRef} />
              <Card.Title>{Obj.getLabel(props.data) ?? props.data.id}</Card.Title>
              <Card.Block end>
                <Menu.Trigger asChild disabled={!menuItems?.length}>
                  <IconButton iconOnly variant='ghost' icon='ph--dots-three-vertical--regular' label='Menu' />
                </Menu.Trigger>
              </Card.Block>
              <Menu.Content items={menuItems} />
            </Card.Header>
            {open && (
              <Card.Row>
                <JsonHighlighter data={props.data} classNames='text-xs' />
              </Card.Row>
            )}
          </Card.Root>
        </Focus.Item>
      </Mosaic.Tile>
    </Menu.Root>
  );
};

DefaultStackTile.displayName = 'DefaultStackTile';
