//
// Copyright 2023 DXOS.org
//

import React, { forwardRef, ForwardRefExoticComponent, RefAttributes } from 'react';

import { List, useTranslation } from '@dxos/aurora';
import { DelegatorProps } from '@dxos/aurora-grid';
import { dropRing, mx, textBlockWidth } from '@dxos/aurora-theme';

import { STACK_PLUGIN, StackModel } from '../types';

export const StackSections: ForwardRefExoticComponent<DelegatorProps<StackModel> & RefAttributes<HTMLDivElement>> =
  forwardRef<HTMLDivElement, DelegatorProps<StackModel>>(({ children, isCopyDestination, isEmpty }, forwardedRef) => {
    const { t } = useTranslation(STACK_PLUGIN);
    return (
      <div
        role='none'
        className={mx(textBlockWidth, 'mlb-1 p-2 rounded-xl', isCopyDestination && dropRing)}
        ref={forwardedRef}
      >
        {isEmpty ? (
          <p className='text-center m-1 p-4 border border-dashed border-neutral-500/50 rounded'>
            {t('empty stack message')}
          </p>
        ) : (
          <List variant='ordered' itemSizes='many'>
            {children}
          </List>
        )}
      </div>
    );
  });
