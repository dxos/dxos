//
// Copyright 2023 DXOS.org
//

import React, { forwardRef, type ForwardRefExoticComponent, type RefAttributes } from 'react';

import { List, useTranslation } from '@dxos/aurora';
import { type DelegatorProps } from '@dxos/aurora-grid';
import { dropRing, mx, textBlockWidth } from '@dxos/aurora-theme';

import { STACK_PLUGIN, type StackModel } from '../types';

export const StackSections: ForwardRefExoticComponent<DelegatorProps<StackModel> & RefAttributes<HTMLDivElement>> =
  forwardRef<HTMLDivElement, DelegatorProps<StackModel>>(({ children, isCopyDestination, isEmpty }, forwardedRef) => {
    const { t } = useTranslation(STACK_PLUGIN);
    return (
      <div role='none' className={mx(textBlockWidth, 'p-1')}>
        <div role='none' className={mx('p-1 rounded-xl', isCopyDestination && dropRing)}>
          <div role='none' ref={forwardedRef}>
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
        </div>
      </div>
    );
  });
