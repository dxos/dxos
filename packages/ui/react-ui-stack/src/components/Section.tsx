//
// Copyright 2023 DXOS.org
//

import { DotsSixVertical, X, ArrowSquareOut, DotsThreeVertical } from '@phosphor-icons/react';
import React, {
  forwardRef,
  useState,
  type ForwardRefExoticComponent,
  type RefAttributes,
  type FC,
  type PropsWithChildren,
} from 'react';

import { type Node } from '@dxos/app-graph';
import { Button, DensityProvider, DropdownMenu, List, ListItem, useTranslation } from '@dxos/react-ui';
import {
  type MosaicActiveType,
  type MosaicDataItem,
  type MosaicTileComponent,
  type MosaicTileProps,
  useMosaic,
} from '@dxos/react-ui-mosaic';
import {
  fineButtonDimensions,
  focusRing,
  getSize,
  hoverableControlItem,
  hoverableControls,
  hoverableFocusedControls,
  hoverableFocusedKeyboardControls,
  hoverableOpenControlItem,
  attentionSurface,
  mx,
  staticFocusRing,
  staticHoverableControls,
} from '@dxos/react-ui-theme';

import { translationKey } from '../translations';

export type StackSectionContent = MosaicDataItem & { title?: string };

export type StackContextValue<TData extends StackSectionContent = StackSectionContent> = {
  SectionContent: FC<{ data: TData }>;
  transform?: (item: MosaicDataItem, type?: string) => StackSectionItem;
  onDeleteSection?: (path: string) => void;
  onNavigateToSection?: (id: string) => void;
};

export type StackItem = MosaicDataItem &
  StackContextValue & {
    items: StackSectionItem[];
  };

export type StackSectionItem = Pick<Node, 'id' | 'label' | 'icon' | 'data' | 'actions' | 'children' | 'properties'>;

export type StackSectionItemWithContext = StackSectionItem & StackContextValue;

export type SectionProps = PropsWithChildren<{
  // Data props.
  id: string;
  title: string;
  separation: boolean;

  // Tile props.
  active?: MosaicActiveType;
  draggableProps?: MosaicTileProps['draggableProps'];
  draggableStyle?: MosaicTileProps['draggableStyle'];
  onDelete?: MosaicTileProps['onDelete'];
  onNavigate?: MosaicTileProps['onNavigate'];
}>;

export const Section: ForwardRefExoticComponent<SectionProps & RefAttributes<HTMLLIElement>> = forwardRef<
  HTMLLIElement,
  SectionProps
>(({ id, title, separation, active, draggableProps, draggableStyle, onDelete, onNavigate, children }, forwardedRef) => {
  const { t } = useTranslation(translationKey);
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);

  return (
    <DensityProvider density='fine'>
      <ListItem.Root
        ref={forwardedRef}
        id={id}
        classNames={['block group', separation && 'pbe-2']}
        style={draggableStyle}
      >
        <div
          role='none'
          className={mx(
            attentionSurface,
            hoverableControls,
            'flex separator-separator border-is border-ie group-first:border-bs border-be',
            separation ? 'min-bs-[4rem] border-bs' : 'border-bs-0',
            active && staticHoverableControls,
            active && 'border-bs border-be',
            (active === 'origin' || active === 'rearrange' || active === 'destination') && 'opacity-0',
          )}
        >
          <ListItem.Heading classNames='sr-only'>{title}</ListItem.Heading>

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
          <div role='none' className='flex flex-1 min-is-0'>
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
                    <DropdownMenu.Item onClick={() => onDelete?.()} data-testid='section.remove'>
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

export const SectionTile: MosaicTileComponent<StackSectionItemWithContext, HTMLLIElement> = forwardRef(
  ({ path, type, active, draggableStyle, draggableProps, item, itemContext }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const { activeItem } = useMosaic();

    const separation = !!itemContext?.separation;
    const { transform, onDeleteSection, onNavigateToSection, SectionContent, ...contentItem } = {
      ...itemContext,
      ...item,
    };

    const transformedItem = transform
      ? transform(
          contentItem,
          // TODO(wittjosiah): `active` doesn't always seem to be accurate here.
          activeItem?.item.id === contentItem.id ? activeItem?.type : type,
        )
      : contentItem;

    const title = transformedItem?.label
      ? typeof transformedItem.label === 'string'
        ? transformedItem.label
        : t(...transformedItem.label)
      : t('untitled section title');

    const section = (
      <Section
        ref={forwardedRef}
        id={transformedItem.id}
        title={title}
        separation={separation}
        active={active}
        draggableProps={draggableProps}
        draggableStyle={draggableStyle}
        onDelete={() => onDeleteSection?.(path)}
        onNavigate={() => onNavigateToSection?.(transformedItem.id)}
      >
        {SectionContent && <SectionContent {...transformedItem} />}
      </Section>
    );

    return active === 'overlay' ? <List>{section}</List> : section;
  },
);
