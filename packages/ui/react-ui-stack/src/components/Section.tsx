//
// Copyright 2023 DXOS.org
//

import { DotsSixVertical, X, ArrowSquareOut, DotsThreeVertical } from '@phosphor-icons/react';
import React, { type PropsWithChildren, forwardRef, useState } from 'react';

import { Button, DensityProvider, DropdownMenu, ListItem, useTranslation } from '@dxos/react-ui';
import { type MosaicActiveType, type MosaicTileProps } from '@dxos/react-ui-mosaic';
import {
  fineButtonDimensions,
  focusRing,
  getSize,
  hoverableControlItem,
  hoverableControls,
  hoverableFocusedControls,
  hoverableFocusedKeyboardControls,
  hoverableOpenControlItem,
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
  onNavigate?: MosaicTileProps['onNavigate'];
}>;

export const Section = forwardRef<HTMLLIElement, SectionProps>(
  ({ id, title, active, draggableProps, draggableStyle, onRemove, onNavigate, children }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);

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
            <DropdownMenu.Root
              {...{
                open: optionsMenuOpen,
                onOpenChange: (nextOpen: boolean) => {
                  // if (!nextOpen) {
                  //   suppressNextTooltip.current = true;
                  // }
                  return setOptionsMenuOpen(nextOpen);
                },
              }}
            >
              <DropdownMenu.Trigger asChild>
                <Button
                  variant='ghost'
                  classNames={[
                    'shrink-0 pli-2 pointer-fine:pli-1 rounded-none',
                    hoverableControlItem,
                    hoverableFocusedControls,
                    hoverableOpenControlItem,
                    active === 'overlay' && 'invisible',
                  ]}
                  // data-testid={testId}
                >
                  <DotsThreeVertical className={getSize(4)} />
                </Button>
              </DropdownMenu.Trigger>

              <DropdownMenu.Portal>
                <DropdownMenu.Content>
                  <DropdownMenu.Viewport>
                    <DropdownMenu.Item onClick={onNavigate}>
                      <ArrowSquareOut className={mx(getSize(5), 'mr-2')} />
                      <span className='grow'>{t('navigate to section label')}</span>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item onClick={onRemove}>
                      <X className={mx(getSize(5), 'mr-2')} />
                      <span className='grow'>{t('remove section label')}</span>
                    </DropdownMenu.Item>
                  </DropdownMenu.Viewport>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </ListItem.Root>
      </DensityProvider>
    );
  },
);
