//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React from 'react';

import { Card } from '@dxos/aurora';

import { DemoCanvas } from './DemoCanvas';
import { DemoGrid } from './DemoGrid';
import { DemoStack } from './DemoStack';
import { DemoTree } from './DemoTree';
import { MosaicContextProvider } from '../../dnd';
import { ComplexCard, FullscreenDecorator, SimpleCard } from '../../testing';

faker.seed(5);

export default {
  component: Card,
  decorators: [FullscreenDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

const debug = true;
const types = ['document', 'image'];

export const Default = () => (
  <MosaicContextProvider debug={debug}>
    <div className='flex grow overflow-hidden'>
      <div className='flex shrink-0 w-[280px] overflow-hidden'>
        <DemoStack id='stack-1' Component={SimpleCard} types={types} debug={debug} className='p-2' />
      </div>
      <div className='flex grow overflow-hidden bg-neutral-900'>
        <DemoGrid id='grid-1' Component={ComplexCard} types={types} debug={debug} className='p-4' />
      </div>
      <div className='flex shrink-0 w-[280px] overflow-hidden bg-neutral-900'>
        <DemoStack id='stack-2' Component={ComplexCard} types={types} debug={debug} className='py-2 pr-4' />
      </div>
    </div>
  </MosaicContextProvider>
);

export const Tree = () => (
  <MosaicContextProvider debug={debug}>
    <div className='flex grow overflow-hidden'>
      <div className='flex shrink-0 w-[280px] overflow-hidden'>
        <DemoTree id='tree-1' types={types} debug={debug} />
      </div>
      <div className='flex grow overflow-hidden'>
        <DemoGrid id='grid-1' Component={ComplexCard} types={types} debug={debug} className='p-4 bg-neutral-900' />
      </div>
      <div className='flex shrink-0 w-[280px] overflow-hidden'>
        <DemoStack id='stack-2' Component={ComplexCard} types={types} debug={debug} className='p-2 bg-neutral-900' />
      </div>
    </div>
  </MosaicContextProvider>
);

export const Canvas = () => (
  <MosaicContextProvider debug={debug}>
    <div className='flex grow overflow-hidden'>
      <div className='flex shrink-0 w-[280px] overflow-hidden'>
        <DemoTree id='tree-1' types={types} debug={debug} />
      </div>
      <div className='flex grow overflow-hidden'>
        <DemoCanvas id='grid-1' debug={debug} className='p-4' />
      </div>
      <div className='flex shrink-0 w-[280px] overflow-hidden'>
        <DemoStack id='stack-2' Component={ComplexCard} types={types} debug={debug} className='p-2 bg-neutral-900' />
      </div>
    </div>
  </MosaicContextProvider>
);
