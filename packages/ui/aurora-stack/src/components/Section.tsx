//
// Copyright 2023 DXOS.org
//

import { DotsSixVertical, X } from '@phosphor-icons/react';
import React, { PropsWithChildren, forwardRef } from 'react';

import { Button, DensityProvider, ListItem, useTranslation } from '@dxos/aurora';
import { MosaicActiveType, MosaicTileProps } from '@dxos/aurora-grid/next';
import {
  fineButtonDimensions,
  focusRing,
  getSize,
  hoverableControlItem,
  hoverableControls,
  hoverableFocusedControls,
  hoverableFocusedKeyboardControls,
  inputSurface,
  mx,
  staticHoverableControls,
  surfaceElevation,
} from '@dxos/aurora-theme';

export type SectionProps = PropsWithChildren<{
  // Data props.
  id: string;
  title: string;

  // Tile props.
  active?: MosaicActiveType;
  draggableProps?: MosaicTileProps['draggableProps'];
  draggableStyle?: MosaicTileProps['draggableStyle'];
  onRemove?: MosaicTileProps['onRemove'];
}>;

export const Section = forwardRef<HTMLLIElement, SectionProps>(
  ({ id, title, active, draggableProps, draggableStyle, onRemove, children }, forwardedRef) => {
    const { t } = useTranslation('stack');

    return (
      <DensityProvider density='fine'>
        <ListItem.Root ref={forwardedRef} id={id} classNames='pbe-2 block' style={draggableStyle}>
          <div
            role='none'
            className={mx(
              surfaceElevation({ elevation: 'group' }),
              inputSurface,
              hoverableControls,
              'flex rounded',
              active && staticHoverableControls,
              active === 'destination' && 'opacity-50',
              (active === 'origin' || active === 'rearrange') && 'opacity-0',
            )}
          >
            <ListItem.Heading classNames='sr-only'>{title}</ListItem.Heading>
            <div
              className={mx(
                fineButtonDimensions,
                focusRing,
                hoverableFocusedKeyboardControls,
                'self-stretch flex items-center rounded-is justify-center bs-auto is-auto',
                active === 'destination' && 'invisible',
                active === 'overlay' && 'text-primary-600 dark:text-primary-300',
              )}
              {...draggableProps}
            >
              <DotsSixVertical
                weight={active === 'overlay' ? 'bold' : 'regular'}
                className={mx(getSize(5), hoverableControlItem, 'transition-opacity')}
              />
            </div>
            <div role='none' className='flex-1 min-is-0'>
              {children}
            </div>
            <Button
              variant='ghost'
              classNames={[
                'self-stretch justify-start rounded-is-none',
                hoverableFocusedControls,
                active === 'destination' && 'invisible',
              ]}
              onClick={onRemove}
            >
              <span className='sr-only'>{t('remove section label')}</span>
              <X className={mx(getSize(4), hoverableControlItem, 'transition-opacity')} />
            </Button>
          </div>
        </ListItem.Root>
      </DensityProvider>
    );
  },
);
