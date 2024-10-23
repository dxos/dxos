//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import * as ModalPrimitive from '@radix-ui/react-popper';
import React, { type MouseEvent, useCallback, useRef, useState } from 'react';

import { DropdownMenu, useThemeContext } from '@dxos/react-ui';
import { withTheme } from '@dxos/storybook-utils';

import { Grid, type GridContentProps, type GridRootProps } from './Grid';

type StoryGridProps = GridContentProps & Pick<GridRootProps, 'onEditingChange'>;

const StoryGrid = ({ onEditingChange, ...props }: StoryGridProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const { tx } = useThemeContext();

  const handleClick = useCallback((event: MouseEvent) => {
    const closestAction = (event.target as HTMLElement).closest('button[data-story-action]');
    if (closestAction) {
      triggerRef.current = closestAction as HTMLDivElement;
      setMenuOpen(true);
    }
  }, []);

  return (
    // TODO(thure): This is no good very (my) bad. Refactor as part of #7962.
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

export const Basic = {
  args: {
    id: 'story',
    initialCells: {
      grid: {
        '1,1': {
          accessoryHtml:
            '<button class="ch-button is-6 pli-0.5 min-bs-0 absolute inset-block-1 inline-end-1" data-story-action="menu"><svg><use href="/icons.svg#ph--arrow-right--regular"/></svg></button>',
          value: 'Weekly sales report',
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
  } satisfies StoryGridProps,
};
