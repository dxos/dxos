//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { templateForComponent } from '../../testing';
import { ListPrimitive, ListPrimitiveProps } from './ListPrimitive';

export default {
  title: 'react-list/ListPrimitive',
  component: ListPrimitive,
  argTypes: {}
};

const Template = (args: Omit<ListPrimitiveProps, 'item'>) => {
  return (
    <main className='max-is-lg mli-auto pli-7 mbs-7'>
      <ListPrimitive {...args} />
    </main>
  );
};

export const Default = templateForComponent(Template)({ id: '', items: {}, order: [] });
Default.args = {
  id: 'x123456',
  items: {
    x234567: {
      title: 'Apple'
    },
    x345678: {
      title: 'Grapes',
      annotations: { state: 'done' }
    },
    x456789: {
      title: 'Banana'
    },
    x567890: {
      title: 'Courgette'
    }
  },
  order: ['x234567', 'x345678', 'x456789', 'x567890']
};
