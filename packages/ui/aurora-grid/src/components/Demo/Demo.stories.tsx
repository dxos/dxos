//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React from 'react';

import { Card } from '@dxos/aurora';

import { DemoGrid } from './DemoGrid';
import { DemoStack } from './DemoStack';
import { DemoTree } from './DemoTree';
import { ComplexCard, FullscreenDecorator, MosaicDecorator, SimpleCard } from '../../testing';

faker.seed(5);

export default {
  component: Card,
  decorators: [FullscreenDecorator(), MosaicDecorator],
  parameters: {
    layout: 'fullscreen',
  },
};

const debug = false;
const types = ['document', 'image'];

export const Default = () => (
  <div className='flex grow overflow-hidden'>
    <div className='flex shrink-0 w-[280px] overflow-hidden'>
      <DemoStack id='stack-1' Component={SimpleCard} types={types} debug={debug} className='p-2' />
    </div>
    <div className='flex grow overflow-hidden'>
      <DemoGrid id='grid-1' Component={ComplexCard} types={types} debug={debug} className='p-4 bg-black' />
    </div>
    <div className='flex shrink-0 w-[280px] overflow-hidden'>
      <DemoStack id='stack-2' Component={ComplexCard} types={types} debug={debug} className='p-2 bg-black' />
    </div>
  </div>
);

export const Tree = () => (
  <div className='flex grow overflow-hidden'>
    <div className='flex shrink-0 w-[280px] overflow-hidden'>
      <DemoTree id='tree-1' types={types} debug={debug} />
    </div>
    <div className='flex grow overflow-hidden'>
      <DemoGrid id='grid-1' Component={ComplexCard} types={types} debug={debug} className='p-4 bg-black' />
    </div>
    <div className='flex shrink-0 w-[280px] overflow-hidden'>
      <DemoStack id='stack-2' Component={ComplexCard} types={types} debug={debug} className='p-2 bg-black' />
    </div>
  </div>
);
