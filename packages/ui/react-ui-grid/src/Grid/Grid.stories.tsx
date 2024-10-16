//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Scope } from '@radix-ui/react-context';
import React, { type MouseEvent, type MutableRefObject, useCallback } from 'react';

import { DropdownMenu, useDropdownMenuContext } from '@dxos/react-ui';
import { withTheme } from '@dxos/storybook-utils';

import { Grid, type GridContentProps, type GridRootProps } from './Grid';

type StoryGridProps = GridContentProps & Pick<GridRootProps, 'onEditingChange'>;

type ScopedProps<P> = P & { __scopeDropdownMenu?: Scope };

const StoryGridImpl = ({ onEditingChange, __scopeDropdownMenu, ...props }: ScopedProps<StoryGridProps>) => {
  const { triggerRef, onOpenToggle } = useDropdownMenuContext('StoryGridImpl', __scopeDropdownMenu);
  const handleClick = useCallback(
    (event: MouseEvent) => {
      const closestAction = (event.target as HTMLElement).closest('button[data-story-action]');
      if (closestAction) {
        console.log('[setting trigger ref]');
        (triggerRef as MutableRefObject<HTMLButtonElement>).current = closestAction as HTMLButtonElement;
        onOpenToggle();
      }
    },
    [onOpenToggle],
  );
  return (
    <>
      <Grid.Root id='story' onEditingChange={onEditingChange}>
        <Grid.Content {...props} onClick={handleClick} />
      </Grid.Root>
      <DropdownMenu.Portal>
        <DropdownMenu.Content classNames='z-90'>
          <DropdownMenu.Viewport>
            <DropdownMenu.Item>Hello</DropdownMenu.Item>
          </DropdownMenu.Viewport>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </>
  );
};

const StoryGrid = (props: StoryGridProps) => {
  return (
    <DropdownMenu.Root>
      <StoryGridImpl {...props} />
    </DropdownMenu.Root>
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
