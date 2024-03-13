//
// Copyright 2023 DXOS.org
//

import { ArrowSquareOut, DotsNine, type IconProps, X } from '@phosphor-icons/react';
import React, {
  forwardRef,
  useState,
  type ForwardRefExoticComponent,
  type RefAttributes,
  type FC,
  type PropsWithChildren,
} from 'react';

import { Button, DropdownMenu, List, ListItem, useTranslation } from '@dxos/react-ui';
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
  hoverableFocusedKeyboardControls,
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

export type StackSectionItem = MosaicDataItem & {
  object: StackSectionContent;
};

export type StackSectionItemWithContext = StackSectionItem & StackContextValue;

export type SectionProps = PropsWithChildren<{
  // Data props.
  id: string;
  title: string;
  separation: boolean;
  icon?: FC<IconProps>;

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
>(
  (
    {
      id,
      title,
      icon: Icon = DotsNine,
      separation,
      active,
      draggableProps,
      draggableStyle,
      onDelete,
      onNavigate,
      children,
    },
    forwardedRef,
  ) => {
    const { t } = useTranslation(translationKey);
    const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);

    return (
      <ListItem.Root
        ref={forwardedRef}
        id={id}
        classNames={['grid col-span-2 grid-cols-subgrid group', separation && 'pbe-2']}
        style={draggableStyle}
      >
        <div
          role='none'
          className={mx(
            attentionSurface,
            hoverableControls,
            'grid col-span-2 grid-cols-subgrid separator-separator border-is border-ie group-first:border-bs border-be',
            separation ? 'min-bs-[4rem] border-bs' : 'border-bs-0',
            active && staticHoverableControls,
            active && 'border-bs border-be',
            (active === 'origin' || active === 'rearrange' || active === 'destination') && 'opacity-0',
          )}
        >
          <ListItem.Heading classNames='sr-only'>{title}</ListItem.Heading>

          <DropdownMenu.Root
            {...{
              open: optionsMenuOpen,
              onOpenChange: setOptionsMenuOpen,
            }}
          >
            {/* TODO(thure): Somehow we need to anchor the DropdownMenu.Content against the trigger, but only open the DropdownMenu on `mouseUp` and `keyDown`. */}
            <Button
              variant='ghost'
              className={mx(
                fineButtonDimensions,
                hoverableFocusedKeyboardControls,
                'self-stretch flex items-center rounded-is justify-center bs-auto is-auto',
                active === 'overlay' && document.body.hasAttribute('data-is-keyboard') ? staticFocusRing : focusRing,
              )}
              data-testid='section.drag-handle'
              {...draggableProps}
              onPointerUp={() => {
                if (!active) {
                  console.log('[open menu]', 'todo');
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  console.log('[open menu]', 'todo');
                } else {
                  draggableProps?.onKeyDown?.(e);
                }
              }}
            >
              <Icon className={mx(getSize(5), hoverableControlItem, 'transition-opacity')} />
            </Button>
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

          {/* Main content */}
          <div role='none' className='flex flex-1 min-is-0'>
            {children}
          </div>
        </div>
      </ListItem.Root>
    );
  },
);

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

    // TODO(thure): When `item` is a preview, it is a Graph.Node and has `data` instead of `object`.
    const itemObject = transformedItem.object ?? (transformedItem as unknown as { data: StackSectionContent }).data;

    const section = (
      <Section
        ref={forwardedRef}
        id={transformedItem.id}
        title={itemObject?.title ?? t('untitled section title')}
        separation={separation}
        active={active}
        draggableProps={draggableProps}
        draggableStyle={draggableStyle}
        onDelete={() => onDeleteSection?.(path)}
        onNavigate={() => onNavigateToSection?.(itemObject.id)}
      >
        {SectionContent && <SectionContent data={itemObject} />}
      </Section>
    );

    return active === 'overlay' ? <List>{section}</List> : section;
  },
);
