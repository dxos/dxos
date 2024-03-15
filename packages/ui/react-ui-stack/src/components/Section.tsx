//
// Copyright 2023 DXOS.org
//

import { useTabsterAttributes } from '@fluentui/react-tabster';
import { ArrowSquareOut, CaretUpDown, DotsNine, type IconProps, X } from '@phosphor-icons/react';
import * as CollapsiblePrimitive from '@radix-ui/react-collapsible';
import React, {
  forwardRef,
  useState,
  type ForwardRefExoticComponent,
  type RefAttributes,
  type FC,
  type PropsWithChildren,
  type Dispatch,
  type SetStateAction,
} from 'react';

import { Button, DropdownMenu, List, ListItem, useTranslation, type TFunction } from '@dxos/react-ui';
import {
  type MosaicActiveType,
  type MosaicDataItem,
  type MosaicTileComponent,
  type MosaicTileProps,
  useMosaic,
} from '@dxos/react-ui-mosaic';
import {
  getSize,
  hoverableControlItem,
  hoverableControls,
  hoverableFocusedKeyboardControls,
  attentionSurface,
  mx,
  staticHoverableControls,
  hoverableOpenControlItem,
  hoverableFocusedWithinControls,
} from '@dxos/react-ui-theme';

import { CaretDownUp } from './CaretDownUp';
import { DropDownMenuDragHandleTrigger } from './DropDownMenuDragHandleTrigger';
import { stackColumns } from './style-fragments';
import { translationKey } from '../translations';

const sectionActionDimensions = 'mli-1 p-1 shrink-0 min-bs-0 is-[--rail-action] bs-min';

export type StackSectionContent = MosaicDataItem & { title?: string };

export type CollapsedSections = Record<string, boolean>;

export type StackContextValue<TData extends StackSectionContent = StackSectionContent> = {
  SectionContent: FC<{ data: TData }>;
  transform?: (item: MosaicDataItem, type?: string) => StackSectionItem;
  onDeleteSection?: (path: string) => void;
  onNavigateToSection?: (id: string) => void;
  collapsedSections?: CollapsedSections;
  setCollapsedSections?: Dispatch<SetStateAction<CollapsedSections>>;
};

export type StackItem = MosaicDataItem &
  StackContextValue & {
    items: StackSectionItem[];
  };

export type StackSectionItem = MosaicDataItem & {
  object: StackSectionContent;
  icon?: FC<IconProps>;
  placeholder?: string | [string, Parameters<TFunction>[1]];
};

export type StackSectionItemWithContext = StackSectionItem & StackContextValue;

export type SectionProps = PropsWithChildren<
  {
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
  } & Pick<StackContextValue, 'collapsedSections' | 'setCollapsedSections'>
>;

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
      collapsedSections,
      setCollapsedSections,
      onDelete,
      onNavigate,
      children,
    },
    forwardedRef,
  ) => {
    const { t } = useTranslation(translationKey);
    const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);
    const sectionActionsToolbar = useTabsterAttributes({
      groupper: {},
      focusable: {},
      mover: { cyclic: true, direction: 1, memorizeCurrent: false },
    });

    const collapsed = !!collapsedSections?.[id];

    return (
      <CollapsiblePrimitive.Root
        asChild
        open={!collapsed}
        onOpenChange={(nextOpen) => setCollapsedSections?.({ ...(collapsedSections ?? {}), [id]: !nextOpen })}
      >
        <ListItem.Root
          ref={forwardedRef}
          id={id}
          classNames={[
            'grid col-span-2 group',
            active === 'overlay' ? stackColumns : 'grid-cols-subgrid',
            separation && 'pbe-2',
          ]}
          style={draggableStyle}
        >
          <div
            role='none'
            className={mx(
              attentionSurface,
              hoverableControls,
              hoverableFocusedWithinControls,
              'grid col-span-2 grid-cols-subgrid separator-separator border-is border-ie group-first:border-bs border-be',
              active && staticHoverableControls,
              active && 'border-bs border-be',
              separation ? 'border-bs' : 'border-bs-0',
              (active === 'origin' || active === 'rearrange' || active === 'destination') && 'opacity-0',
            )}
          >
            <div
              role='toolbar'
              aria-label={t('section controls label')}
              {...(!active && { tabIndex: 0 })}
              {...(!active && sectionActionsToolbar)}
              className='grid grid-cols-subgrid ch-focus-ring rounded-sm grid-rows-[min-content_min-content_1fr] pbe-1'
            >
              <DropdownMenu.Root
                {...{
                  open: optionsMenuOpen,
                  onOpenChange: setOptionsMenuOpen,
                }}
              >
                <DropDownMenuDragHandleTrigger
                  active={!!active}
                  variant='ghost'
                  classNames={[hoverableFocusedKeyboardControls, hoverableOpenControlItem]}
                  data-testid='section.drag-handle'
                  {...draggableProps}
                >
                  <Icon className={mx(getSize(5), 'transition-opacity')} />
                </DropDownMenuDragHandleTrigger>
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
              <CollapsiblePrimitive.Trigger asChild>
                <Button
                  variant='ghost'
                  data-state=''
                  classNames={[sectionActionDimensions, !collapsed && hoverableControlItem]}
                >
                  <span className='sr-only'>{t(collapsed ? 'expand label' : 'collapse label')}</span>
                  {collapsed ? <CaretUpDown className={getSize(4)} /> : <CaretDownUp className={getSize(4)} />}
                </Button>
              </CollapsiblePrimitive.Trigger>
            </div>

            {/* Main content */}

            <ListItem.Heading
              classNames={collapsed ? 'grid grid-rows-subgrid grid-cols-subgrid items-center' : 'sr-only'}
            >
              <span className='truncate'>{title}</span>
            </ListItem.Heading>
            <CollapsiblePrimitive.Content className='flex flex-1 min-is-0'>{children}</CollapsiblePrimitive.Content>
          </div>
        </ListItem.Root>
      </CollapsiblePrimitive.Root>
    );
  },
);

export const SectionTile: MosaicTileComponent<StackSectionItemWithContext, HTMLLIElement> = forwardRef(
  ({ path, type, active, draggableStyle, draggableProps, item, itemContext }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const { activeItem } = useMosaic();

    const separation = !!itemContext?.separation;
    const {
      transform,
      onDeleteSection,
      onNavigateToSection,
      SectionContent,
      collapsedSections,
      setCollapsedSections,
      ...contentItem
    } = {
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

    const title =
      itemObject?.title ?? typeof transformedItem.placeholder === 'string'
        ? (transformedItem.placeholder as string)
        : transformedItem.placeholder
          ? t(...transformedItem.placeholder)
          : t('untitled section title');

    const section = (
      <Section
        ref={forwardedRef}
        id={transformedItem.id}
        title={title}
        icon={transformedItem.icon}
        separation={separation}
        active={active}
        draggableProps={draggableProps}
        draggableStyle={draggableStyle}
        collapsedSections={collapsedSections}
        setCollapsedSections={setCollapsedSections}
        onDelete={() => onDeleteSection?.(path)}
        onNavigate={() => onNavigateToSection?.(itemObject.id)}
      >
        {SectionContent && <SectionContent data={itemObject} />}
      </Section>
    );

    return active === 'overlay' ? <List>{section}</List> : section;
  },
);
