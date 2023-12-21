//
// Copyright 2023 DXOS.org
//

import { DotsSixVertical, X, ArrowSquareOut, DotsThreeVertical } from '@phosphor-icons/react';
import React, { forwardRef, useState, type ForwardRefExoticComponent, type RefAttributes } from 'react';

import { Button, DensityProvider, DropdownMenu, List, ListItem, useTranslation } from '@dxos/react-ui';
import { type MosaicTileComponent, useMosaic } from '@dxos/react-ui-mosaic';
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
  staticFocusRing,
  staticHoverableControls,
  surfaceElevation,
} from '@dxos/react-ui-theme';

import { type SectionProps, type StackSectionItemWithContext } from './props';
import { translationKey } from '../translations';

const Section: ForwardRefExoticComponent<SectionProps & RefAttributes<HTMLLIElement>> = forwardRef<
  HTMLLIElement,
  SectionProps
>(({ id, title, active, draggableProps, draggableStyle, onRemove, onNavigate, children }, forwardedRef) => {
  const { t } = useTranslation(translationKey);
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);

  return (
    <DensityProvider density='fine'>
      <ListItem.Root ref={forwardedRef} id={id} classNames='block pbe-2' style={draggableStyle}>
        <div
          role='none'
          className={mx(
            surfaceElevation({ elevation: 'group' }),
            inputSurface,
            hoverableControls,
            'flex rounded min-bs-[4rem]',
            active && staticHoverableControls,
            (active === 'origin' || active === 'rearrange' || active === 'destination') && 'opacity-0',
          )}
        >
          {/* <ListItem.Heading classNames='sr-only'>{title}</ListItem.Heading> */}

          {/* Drag handle */}
          <div
            className={mx(
              fineButtonDimensions,
              hoverableFocusedKeyboardControls,
              'self-stretch flex items-center rounded-is justify-center bs-auto is-auto',
              active === 'overlay' && document.body.hasAttribute('data-is-keyboard') ? staticFocusRing : focusRing,
            )}
            data-testid='section.drag-handle'
            {...draggableProps}
          >
            <DotsSixVertical className={mx(getSize(5), hoverableControlItem, 'transition-opacity')} />
          </div>

          {/* Main content */}
          <div role='none' className='flex-1 min-is-0'>
            {children}
          </div>

          {/* Menu */}
          <div>
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
                    'm-1 shrink-0',
                    hoverableControlItem,
                    hoverableFocusedControls,
                    hoverableOpenControlItem,
                    active === 'overlay' && 'invisible',
                  ]}
                  data-testid='section.options-menu'
                >
                  <DotsThreeVertical className={getSize(4)} />
                </Button>
              </DropdownMenu.Trigger>

              <DropdownMenu.Portal>
                <DropdownMenu.Content>
                  <DropdownMenu.Viewport>
                    <DropdownMenu.Item onClick={onNavigate} data-testid='section.navigate-to'>
                      <ArrowSquareOut className={mx(getSize(5), 'mr-2')} />
                      <span className='grow'>{t('navigate to section label')}</span>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item onClick={onRemove} data-testid='section.remove'>
                      <X className={mx(getSize(5), 'mr-2')} />
                      <span className='grow'>{t('remove section label')}</span>
                    </DropdownMenu.Item>
                  </DropdownMenu.Viewport>
                  <DropdownMenu.Arrow />
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </div>
      </ListItem.Root>
    </DensityProvider>
  );
});

const SECTION_TILE_NAME = 'SectionTile';

const SectionTile: MosaicTileComponent<StackSectionItemWithContext, HTMLLIElement> = forwardRef(
  ({ path, type, active, draggableStyle, draggableProps, item }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const { activeItem } = useMosaic();

    const { transform, onRemoveSection, onNavigateToSection, SectionContent, ...contentItem } = item;

    const transformedItem = transform
      ? transform(
          contentItem,
          // TODO(wittjosiah): `active` doesn't always seem to be accurate here.
          activeItem?.item.id === contentItem.id ? activeItem?.type : type,
        )
      : contentItem;

    const section = (
      <Section
        ref={forwardedRef}
        id={transformedItem.id}
        title={transformedItem.object?.title ?? t('untitled section title')}
        active={active}
        draggableProps={draggableProps}
        draggableStyle={draggableStyle}
        onRemove={() => onRemoveSection?.(path)}
        onNavigate={() => onNavigateToSection?.(transformedItem.object.id)}
      >
        <SectionContent data={transformedItem.object} />
      </Section>
    );

    return active === 'overlay' ? <List>{section}</List> : section;
  },
);

SectionTile.displayName = SECTION_TILE_NAME;

export { Section, SectionTile };
