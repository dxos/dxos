//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { CloseSidebarButton, ToggleSidebarButton } from './SidebarButton';

export const Banner = ({ variant, classNames }: ThemedClassName<{ variant?: 'topbar' | 'sidebar' | 'l0' }>) => {
  if (variant === 'l0') {
    return (
      <header className='grid grid-cols-subgrid col-span-2 bs-[--l0-size] overflow-hidden relative'>
        <div role='none' className='absolute block-start-0 bs-0.5 rounded inset-inline-3 bg-base -z-[1]' />
        <div role='none' className='place-self-center grid'>
          <Surface role='notch-start' limit={1} />
        </div>
        <div role='none' className='is-[--l01-size] grid items-center pie-2'>
          <Surface role='header-end' limit={1} />
        </div>
      </header>
    );
  } else {
    return (
      <header
        className={mx(
          'flex items-stretch relative plb-1 pis-1 pie-2',
          variant === 'topbar' &&
            'fixed inset-inline-0 block-start-[env(safe-area-inset-top)] bs-[--rail-size] border-be border-separator',
          classNames,
        )}
      >
        {variant === 'sidebar' ? <CloseSidebarButton /> : <ToggleSidebarButton />}
        <span className='self-center grow mis-1'>Composer</span>
        {variant === 'topbar' && (
          <div role='none' className='absolute inset-0 pointer-events-none'>
            <div role='none' className='grid bs-full pointer-fine:p-1 max-is-md mli-auto pointer-events-auto'>
              <Surface role='search-input' limit={1} />
            </div>
          </div>
        )}
        <span role='none' className='grow' />
        <Surface role='header-end' limit={1} />
        <Surface role='notch-start' limit={1} />
      </header>
    );
  }
};
