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
        'flex items-stretch pie-2 border-be border-separator p-1',
        variant === 'topbar' && 'fixed inset-inline-0 block-start-0 bs-[--rail-size]',
        classNames,
      )}
    >
      {variant === 'sidebar' ? <CloseSidebarButton /> : <ToggleSidebarButton />}
      <span className='self-center grow mis-1'>Composer</span>
      <Surface role='header-end' limit={1} />
      <Surface role='notch-start' limit={1} />
    </header>
  );
};
