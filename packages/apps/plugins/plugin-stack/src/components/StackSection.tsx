//
// Copyright 2023 DXOS.org
//

import { DotsSixVertical, X } from '@phosphor-icons/react';
import get from 'lodash.get';
import React, { forwardRef, ForwardRefExoticComponent, RefAttributes } from 'react';

import { ListItem, Button, useTranslation, DensityProvider, ListScopedProps } from '@dxos/aurora';
import { DelegatorProps } from '@dxos/aurora-grid';
import {
  fineButtonDimensions,
  focusRing,
  getSize,
  mx,
  inputSurface,
  surfaceElevation,
  hoverableControls,
  staticHoverableControls,
  hoverableControlItem,
  hoverableFocusedControls,
  hoverableFocusedKeyboardControls,
} from '@dxos/aurora-theme';
import { Surface } from '@dxos/react-surface';

import { STACK_PLUGIN, StackSectionModel } from '../types';

type StackSectionProps = DelegatorProps<StackSectionModel> & {
  onRemove?: () => void;
};

export const StackSection: ForwardRefExoticComponent<StackSectionProps & RefAttributes<HTMLLIElement>> = forwardRef<
  HTMLLIElement,
  ListScopedProps<StackSectionProps>
>(
  (
    { onRemove = () => {}, data: section, dragHandleAttributes, dragHandleListeners, style, isActive, isOverlay },
    forwardedRef,
  ) => {
    const { t } = useTranslation(STACK_PLUGIN);
    return (
      <DensityProvider density='fine'>
        <ListItem.Root
          id={section.object.id}
          classNames={[
            surfaceElevation({ elevation: 'group' }),
            inputSurface,
            hoverableControls,
            'grow rounded mlb-2',
            isOverlay && staticHoverableControls,
            isActive ? 'opacity-0' : 'opacity-100',
          ]}
          ref={forwardedRef}
          style={style}
        >
          <ListItem.Heading classNames='sr-only'>
            {get(section, 'object.title', t('generic section heading'))}
          </ListItem.Heading>
          <div
            className={mx(
              fineButtonDimensions,
              focusRing,
              hoverableFocusedKeyboardControls,
              'self-stretch flex items-center rounded-is justify-center bs-auto is-auto',
              isOverlay && 'text-primary-600 dark:text-primary-300',
            )}
            {...dragHandleAttributes}
            {...dragHandleListeners}
          >
            <DotsSixVertical
              weight={isOverlay ? 'bold' : 'regular'}
              className={mx(getSize(5), hoverableControlItem, 'transition-opacity')}
            />
          </div>
          <div role='none' className='flex-1'>
            <Surface role='section' data={section.object} />
          </div>
          <Button
            variant='ghost'
            classNames={['self-stretch justify-start rounded-is-none', hoverableFocusedControls]}
            onClick={onRemove}
          >
            <span className='sr-only'>{t('remove section label')}</span>
            <X className={mx(getSize(4), hoverableControlItem, 'transition-opacity')} />
          </Button>
        </ListItem.Root>
      </DensityProvider>
    );
  },
);
