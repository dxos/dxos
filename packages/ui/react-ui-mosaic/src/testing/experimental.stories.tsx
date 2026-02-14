//
// Copyright 2023 DXOS.org
//

import { type Meta } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { mx } from '@dxos/ui-theme';

import { type Stack } from '../components';

const meta: Meta<typeof Stack> = {
  title: 'ui/react-ui-mosaic/experimental',
  decorators: [withLayout({ layout: 'fullscreen' }), withTheme],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

const Column = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className={mx('flex flex-col border border-separator', 'is-screen md:is-64 snap-center md:rounded')}>
      <div className='p-2'>{children}</div>
    </div>
  );
};

/**
 * Snap center of column.
 */
export const Snap = {
  decorators: [withTheme, withLayout({ layout: 'fullscreen' })],
  render: () => (
    <div className={mx('flex bs-full overflow-x-auto', 'snap-x snap-mandatory md:snap-none md:p-4')}>
      <div className='bs-full flex gap-4'>
        {Array.from({ length: 5 }).map((_, i) => (
          <Column key={i}>Column {i + 1}</Column>
        ))}
      </div>
    </div>
  ),
};
