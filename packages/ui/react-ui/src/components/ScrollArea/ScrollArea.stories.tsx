//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { withTheme } from '../../testing';

import { ScrollArea } from './ScrollArea';

export default {
  title: 'ui/react-ui-core/components/ScrollArea',
  component: ScrollArea,
  decorators: [withTheme],
  parameters: {
    layout: 'centered',
  },
};

const Column = () => (
  <div>
    {Array.from({ length: 50 }).map((_, index) => (
      <div key={index} className='text-sm'>
        Item {index + 1}
      </div>
    ))}
  </div>
);

const Row = () => (
  <div className='flex gap-4 is-max'>
    {Array.from({ length: 50 }).map((_, index) => (
      <div
        key={index}
        className='shrink-0 bs-20 is-20 border border-separator rounded-md flex items-center justify-center text-sm'
      >
        {index + 1}
      </div>
    ))}
  </div>
);

export const Vertical = {
  render: () => (
    <div className='bs-72 is-48 p-2 border border-separator rounded-md'>
      <ScrollArea>
        <Column />
      </ScrollArea>
    </div>
  ),
};

export const VerticalThin = {
  render: () => (
    <div className='bs-72 is-48 p-2 border border-separator rounded-md'>
      <ScrollArea thin>
        <Column />
      </ScrollArea>
    </div>
  ),
};

export const Horizontal = {
  render: () => (
    <div className='is-96 p-2 border border-separator rounded-md'>
      <ScrollArea orientation='horizontal'>
        <Row />
      </ScrollArea>
    </div>
  ),
};

export const HorizontalThin = {
  render: () => (
    <div className='is-96 p-2 border border-separator rounded-md'>
      <ScrollArea thin orientation='horizontal'>
        <Row />
      </ScrollArea>
    </div>
  ),
};

export const Both = {
  render: () => (
    <div className='bs-72 is-96 p-2 border border-separator rounded-md'>
      <ScrollArea orientation='both' classNames='grid flex bs-full overflow-hidden'>
        <div className='is-max'>
          {Array.from({ length: 50 }).map((_, rowIndex) => (
            <div key={rowIndex} className='flex gap-4'>
              {Array.from({ length: 50 }).map((_, colIndex) => (
                <div key={colIndex} className='shrink-0 bs-20 is-20 flex items-center justify-center text-sm'>
                  {rowIndex},{colIndex}
                </div>
              ))}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  ),
};
