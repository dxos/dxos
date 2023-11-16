//
// Copyright 2023 DXOS.org
//

import { DotsSixVertical, X } from '@phosphor-icons/react';
import React, { type PropsWithChildren, forwardRef } from 'react';

import { Card, DensityProvider, DropdownMenu, ListItem, useTranslation } from '@dxos/react-ui';
import { type MosaicActiveType, type MosaicTileProps } from '@dxos/react-ui-mosaic';
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
} from '@dxos/react-ui-theme';

import { translationKey } from '../translations';

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
    const { t } = useTranslation(translationKey);

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

            {/* Main content. */}
            <div role='none' className='flex flex-1 min-is-0 overflow-hidden'>
              {children}
            </div>

            <Card.Menu
              position={undefined}
              classNames={mx(
                fineButtonDimensions,
                'self-stretch justify-center rounded-is flex items-center bs-auto is-auto',
                hoverableFocusedControls,
                active === 'destination' && 'invisible',
                active === 'overlay' && 'text-primary-600 dark:text-primary-300',
              )}
            >
              <DropdownMenu.Item onClick={onRemove}>
                <X className={mx(getSize(5), 'mr-2')} />
                <span className='grow'>Remove</span>
              </DropdownMenu.Item>
            </Card.Menu>
          </div>
        </ListItem.Root>
      </DensityProvider>
    );
  },
);
