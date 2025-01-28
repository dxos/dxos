//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { CloseSidebarButton, ToggleSidebarButton } from './SidebarButton';

export const Banner = ({ variant, classNames }: ThemedClassName<{ variant?: 'topbar' | 'sidebar' }>) => {
  return (
    <header
      className={mx(
        'flex items-stretch relative',
        variant === 'topbar'
          ? 'fixed inset-inline-0 block-start-0 p-1 bs-[--rail-size] border-be border-separator'
          : 'pbs-1 pli-2',
        classNames,
      )}
    >
      {variant === 'sidebar' ? <CloseSidebarButton /> : <ToggleSidebarButton />}
      <span className='self-center grow mis-1'>Composer</span>
      {variant === 'topbar' && (
        <div role='none' className='absolute inset-0 pointer-events-none'>
          <div role='none' className='grid bs-full p-2 max-is-md mli-auto pointer-events-auto'>
            <Surface role='search-input' limit={1} />
          </div>
        </div>
      )}
      <span role='none' className='grow' />
      <Surface role='header-end' limit={1} />
      <Surface role='notch-start' limit={1} />
    </header>
  );
};
