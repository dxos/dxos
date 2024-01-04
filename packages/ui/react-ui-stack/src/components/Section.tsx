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

<<<<<<< Updated upstream
=======
export type StackSectionContent = MosaicDataItem & { title?: string };

export type StackContextValue<TData extends StackSectionContent = StackSectionContent> = {
  SectionContent: FC<{ data: TData }>;
  transform?: (item: MosaicDataItem, type?: string) => StackSectionItem;
  onRemoveSection?: (path: string) => void;
  onNavigateToSection?: (id: string) => void;
};

export type StackItem = MosaicDataItem &
  StackContextValue & {
    items: StackSectionItem[];
  };

export type StackSectionItem = MosaicDataItem & {
  object: StackSectionContent;
};

export type StackSectionItemWithContext = StackSectionItem & StackContextValue;

>>>>>>> Stashed changes
export type SectionProps = PropsWithChildren<{
  // Data props.
  id: string;
  title: string;
  index: number;
  count: number;

  // Tile props.
  active?: MosaicActiveType;
  draggableProps?: MosaicTileProps['draggableProps'];
  draggableStyle?: MosaicTileProps['draggableStyle'];
  onRemove?: MosaicTileProps['onRemove'];
  onNavigate?: MosaicTileProps['onNavigate'];
}>;

<<<<<<< Updated upstream
export const Section = forwardRef<HTMLLIElement, SectionProps>(
=======
export const Section: ForwardRefExoticComponent<SectionProps & RefAttributes<HTMLLIElement>> = forwardRef<
  HTMLLIElement,
  SectionProps
>(
>>>>>>> Stashed changes
  (
    { id, title, index, count, active, draggableProps, draggableStyle, onRemove, onNavigate, children },
    forwardedRef,
  ) => {
<<<<<<< Updated upstream
=======
    const { t } = useTranslation(translationKey);
    const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);

    return (
      <DensityProvider density='fine'>
        <ListItem.Root ref={forwardedRef} id={id} classNames='block __pbe-2' style={draggableStyle}>
          <div
            role='none'
            className={mx(
              surfaceElevation({ elevation: 'group' }),
              inputSurface,
              hoverableControls,
              'flex __rounded __min-bs-[4rem]',
              index === 0 && 'rounded-t',
              index === count - 1 && 'rounded-b',
              active && staticHoverableControls,
              (active === 'origin' || active === 'rearrange' || active === 'destination') && 'opacity-0',
            )}
          >
            <ListItem.Heading classNames='sr-only'>{title}</ListItem.Heading>

            {/* Drag handle */}
            <div
              className={mx(
                fineButtonDimensions,
                hoverableFocusedKeyboardControls,
                'self-stretch flex items-center __rounded-is justify-center bs-auto is-auto',
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
  },
);

export const SectionTile: MosaicTileComponent<StackSectionItemWithContext, HTMLLIElement> = forwardRef(
  ({ path, type, position, active, draggableStyle, draggableProps, item, itemContext }, forwardedRef) => {
>>>>>>> Stashed changes
    const { t } = useTranslation(translationKey);
    const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);

<<<<<<< Updated upstream
    return (
      <DensityProvider density='fine'>
        <ListItem.Root ref={forwardedRef} id={id} classNames='block' style={draggableStyle}>
          <div
            role='none'
            className={mx(
              surfaceElevation({ elevation: 'group' }),
              inputSurface,
              hoverableControls,
              'flex',
              index === 0 && 'rounded-t',
              index === count - 1 && 'rounded-b',
              active && staticHoverableControls,
              active === 'destination' && 'opacity-50',
              (active === 'origin' || active === 'rearrange') && 'opacity-0',
            )}
          >
            <ListItem.Heading classNames='sr-only'>{title}</ListItem.Heading>
=======
    const { count = 0 } = itemContext ?? {};
    const { transform, onRemoveSection, onNavigateToSection, SectionContent, ...contentItem } = {
      ...itemContext,
      ...item,
    };
>>>>>>> Stashed changes

            {/* Drag handle */}
            <div
              className={mx(
                fineButtonDimensions,
                focusRing,
                hoverableFocusedKeyboardControls,
                'self-stretch flex items-center justify-center bs-auto is-auto',
                active === 'destination' && 'invisible',
                active === 'overlay' && 'text-primary-600 dark:text-primary-300',
              )}
              data-testid='section.drag-handle'
              {...draggableProps}
            >
              <DotsSixVertical
                weight={active === 'overlay' ? 'bold' : 'regular'}
                className={mx(getSize(5), hoverableControlItem, 'transition-opacity')}
              />
            </div>

            {/* Main content */}
            <div role='none' className='flex flex-1 min-is-0 overflow-hidden'>
              {children}
            </div>

<<<<<<< Updated upstream
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
=======
    const section = (
      <Section
        ref={forwardedRef}
        id={transformedItem.id}
        index={position as number}
        count={count as number}
        title={itemObject?.title ?? t('untitled section title')}
        active={active}
        draggableProps={draggableProps}
        draggableStyle={draggableStyle}
        onRemove={() => onRemoveSection?.(path)}
        onNavigate={() => onNavigateToSection?.(itemObject.id)}
      >
        {SectionContent && <SectionContent data={itemObject} />}
      </Section>
>>>>>>> Stashed changes
    );
  },
);
