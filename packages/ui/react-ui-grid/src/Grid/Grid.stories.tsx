//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import * as ModalPrimitive from '@radix-ui/react-popper';
import { type StoryObj } from '@storybook/react';
import React, { type MouseEvent, useCallback, useRef, useState } from 'react';

import { DropdownMenu, useThemeContext } from '@dxos/react-ui';
import { withTheme } from '@dxos/storybook-utils';

import { Grid, type GridContentProps, type GridRootProps } from './Grid';

type StoryGridProps = GridContentProps & Pick<GridRootProps, 'onEditingChange'>;

const CUSTOM_PROP = 'data-story-action';

const StoryGrid = ({ onEditingChange, ...props }: StoryGridProps) => {
  const { tx } = useThemeContext();
  const triggerRef = useRef<HTMLDivElement | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const handleClick = useCallback((event: MouseEvent) => {
    const closestAction = (event.target as HTMLElement).closest(`button[${CUSTOM_PROP}]`);
    if (closestAction) {
      triggerRef.current = closestAction as HTMLDivElement;
      setMenuOpen(true);
    }
  }, []);

  return (
    <ModalPrimitive.Root>
      <Grid.Root id='story' onEditingChange={onEditingChange}>
        <Grid.Content {...props} onClick={handleClick} />
      </Grid.Root>
      <ModalPrimitive.Anchor virtualRef={triggerRef} />
      <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenu.Content classNames='contents'>
          <ModalPrimitive.Content className={tx('menu.content', 'menu__content', {})}>
            <DropdownMenu.Item onClick={() => console.log('[Click on dropdown menu item]')}>Hello</DropdownMenu.Item>
            <ModalPrimitive.Arrow className={tx('menu.arrow', 'menu__arrow', {})} />
          </ModalPrimitive.Content>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </ModalPrimitive.Root>
  );
};

export default {
  title: 'react-ui-grid/Grid',
  component: StoryGrid,
  decorators: [withTheme],
  parameters: { layout: 'fullscreen' },
};

// TODO(burdon): This doesn't work in the storybook, but works in the table plugin.
//  Throws Internal Error: expected template strings to be an array with a 'raw' field.
const debug = false;
const accessoryHtml =
  '<dx-button class="ch-button is-4 pli-0.5 min-bs-0 absolute inset-block-1 inline-end-1" icon="ph--caret-down--regular">' +
  '</dx-button>';
// const accessory = debug
//   ? button({
//       className: 'ch-button is-4 pli-0.5 min-bs-0 absolute inset-block-1 inline-end-3',
//       icon: 'ph--caret-down--regular',
//       [CUSTOM_PROP]: 'menu',
//     })
//   : undefined;
// TODO(burdon): Space for resize button.
// TODO(burdon): Disappears after resize. Resize doesn't work after menu popup.
// const accessoryHtml = !debug
//   ? '<button class="ch-button is-4 pli-0.5 min-bs-0 absolute inset-block-1 inline-end-1" data-story-action="menu">' +
//     '<svg><use href="/icons.svg#ph--caret-down--regular"/></svg>' +
//     '</button>'
//   : undefined;

export const Basic: StoryObj<StoryGridProps> = {
  args: {
    id: 'story',
    initialCells: {
      grid: {
        '1,1': {
          value: String(100),
          resizeHandle: 'col',
          accessoryHtml,
          // accessory,
        },
      },
    },
    columnDefault: {
      grid: {
        size: 180,
        resizeable: true,
      },
    },
    rowDefault: {
      grid: {
        size: 32,
        resizeable: true,
      },
    },
    columns: {
      grid: {
        0: { size: 200 },
        1: { size: 210 },
        2: { size: 230 },
        3: { size: 250 },
        4: { size: 270 },
      },
    },
    onAxisResize: (event) => {
      console.log('[axis resize]', event);
    },
    onEditingChange: (event) => {
      console.log('[edit]', event);
    },
  },
};
