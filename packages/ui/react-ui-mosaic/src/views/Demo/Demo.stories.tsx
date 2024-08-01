//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { faker } from '@dxos/random';
import { withFullscreen, withTheme } from '@dxos/storybook-utils';

import { Mosaic } from '../../mosaic';
import { ComplexCard, SimpleCard } from '../../testing';
import { DemoGrid } from '../Grid/testing';
import { DemoKanban } from '../Kanban/testing';
import { DemoStack } from '../Stack/testing';
import { DemoTree } from '../Tree/testing';

faker.seed(5);

export default {
  title: 'react-ui-mosaic/Demo',
  decorators: [withTheme, withFullscreen()],
  parameters: {
    layout: 'fullscreen',
  },
};

const debug = false;
const types = ['document', 'image'];

export const Default = () => (
  <Mosaic.Root debug={debug}>
    <Mosaic.DragOverlay />
    <div className='flex grow overflow-hidden'>
      <div className='flex shrink-0 w-[280px] overflow-hidden'>
        <DemoStack id='stack-1' Component={SimpleCard} types={types} debug={debug} classNames='p-2' />
      </div>
      <div className='flex grow overflow-hidden bg-neutral-900'>
        <DemoGrid id='grid-1' Component={ComplexCard} types={types} debug={debug} classNames='p-4' />
      </div>
      <div className='flex shrink-0 w-[280px] overflow-hidden bg-neutral-900'>
        <DemoStack id='stack-2' Component={ComplexCard} types={types} debug={debug} />
      </div>
    </div>
  </Mosaic.Root>
);

export const Tree = () => (
  <Mosaic.Root debug={debug}>
    <Mosaic.DragOverlay />
    <div className='flex grow overflow-hidden'>
      <div className='flex shrink-0 w-[280px] overflow-hidden'>
        <DemoTree id='tree-1' types={types} debug={debug} />
      </div>
      <div className='flex grow overflow-hidden'>
        <DemoGrid id='grid-1' Component={ComplexCard} types={types} debug={debug} classNames='p-4 bg-neutral-900' />
      </div>
      <div className='flex shrink-0 w-[280px] overflow-hidden bg-neutral-900'>
        <DemoStack id='stack-2' Component={ComplexCard} types={types} debug={debug} />
      </div>
    </div>
  </Mosaic.Root>
);

export const Kanban = () => (
  <Mosaic.Root debug={debug}>
    <Mosaic.DragOverlay />
    <div className='flex grow overflow-hidden'>
      <div className='flex shrink-0 w-[280px] overflow-hidden'>
        <DemoTree id='tree-1' types={types} debug={debug} />
      </div>
      <div className='flex grow overflow-hidden'>
        <DemoKanban id='kanban-1' Component={SimpleCard} debug={debug} classNames='p-4' />
      </div>
      <div className='flex shrink-0 w-[280px] overflow-hidden bg-neutral-900 pl-2'>
        <DemoStack id='stack-1' Component={ComplexCard} types={types} debug={debug} />
      </div>
    </div>
  </Mosaic.Root>
);
