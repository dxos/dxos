//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useRef, useState } from 'react';

import { Obj } from '@dxos/echo';
import { Next } from '@dxos/react-ui';
import { ActionMenu, createMenuAction } from '@dxos/react-ui-menu';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';

import { Mosaic, type MosaicStackTileComponent } from '../components/index.ts';

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
    <>
      {/*
       * `Mosaic.Tile` sets `aria-current` from `props.current`, which the
       * Slot composition propagates down to `Card.Root`'s div. That's what
       * makes `dx-current` (an `aria-[current=true]:` utility) actually
       * fire here. See `ui-theme/src/css/components/selected.md`.
       */}
      <Mosaic.Tile {...props} asChild>
        <Next.Focus.Item asChild>
          <Next.Card.Root classNames='dx-current dx-hover'>
            <Next.Card.Header>
              <Next.DragHandle ref={dragHandleRef} />
              <Next.Card.Title>{Obj.getLabel(props.data) ?? props.data.id}</Next.Card.Title>
              <Next.Block rail='end'>
                <ActionMenu disabled={!menuItems?.length} actions={menuItems}>
                  <Next.Button iconOnly variant='ghost' icon='ph--dots-three-vertical--regular' label='Menu' />
                </ActionMenu>
              </Next.Block>
            </Next.Card.Header>
            {open && (
              <Next.Card.Row>
                <JsonHighlighter data={props.data} classNames='text-xs' />
              </Next.Card.Row>
            )}
          </Next.Card.Root>
        </Next.Focus.Item>
      </Mosaic.Tile>
    </>
  );
};

DefaultStackTile.displayName = 'DefaultStackTile';
