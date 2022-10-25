//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { templateForComponent } from '../../testing';
import { NavMenu, NavMenuProps } from './NavMenu';

export default {
  title: 'react-ui/NavMenu',
  component: NavMenu
};

const Template = (props: NavMenuProps) => {
  return <NavMenu {...props} />;
};

export const Default = templateForComponent(Template)({ items: [] });
Default.args = {
  items: [
    {
      triggerLinkProps: { href: '#Hello' },
      children: 'Hello',
      active: true
    },
    {
      children: 'How’s it going?',
      content: (
        <div className='w-[21rem] lg:w-[23rem] p-3'>
          <div className='grid grid-cols-6 gap-4'>
            <div className='col-span-2 w-full bg-gray-100 dark:bg-gray-900 p-4 rounded-md'></div>

            <div className='col-span-4 w-full flex flex-col space-y-3 bg-gray-100 dark:bg-gray-900 p-4 rounded-md'>
              <div className='w-full bg-white dark:bg-gray-700 h-12 rounded-md'></div>
              <div className='w-full bg-white dark:bg-gray-700 h-12 rounded-md'></div>
              <div className='w-full bg-white dark:bg-gray-700 h-12 rounded-md'></div>
              <div className='w-full bg-white dark:bg-gray-700 h-12 rounded-md'></div>
            </div>
          </div>
        </div>
      )
    },
    {
      triggerLinkProps: { href: '#Goodbye' },
      tooltip: {
        content: 'More info about Goodbye',
        sideOffset: 8
      },
      children: 'Goodbye'
    }
  ]
};
