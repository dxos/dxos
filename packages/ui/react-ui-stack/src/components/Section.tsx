//
// Copyright 2023 DXOS.org
//

import { useFocusableGroup, useTabsterAttributes } from '@fluentui/react-tabster';
import {
  ArrowLineDown,
  ArrowLineUp,
  ArrowSquareOut,
  CaretUpDown,
  DotsNine,
  type IconProps,
  X,
} from '@phosphor-icons/react';
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
import { DropDownMenuDragHandleTrigger } from '@dxos/react-ui-deck';
import {
  type MosaicActiveType,
  type MosaicDataItem,
  type MosaicTileComponent,
  type MosaicTileProps,
  useMosaic,
} from '@dxos/react-ui-mosaic';
import { focusRing, getSize, mx } from '@dxos/react-ui-theme';

import { CaretDownUp } from './CaretDownUp';
import { stackColumns } from './style-fragments';
import { translationKey } from '../translations';

const sectionActionDimensions = 'p-1 shrink-0 min-bs-0 is-[--rail-action] bs-min';

export type StackSectionContent = MosaicDataItem & { title?: string };

export type CollapsedSections = Record<string, boolean>;

export type AddSectionPosition = 'before' | 'after' | 'beforeAll' | 'afterAll';

export type StackContextValue<TData extends StackSectionContent = StackSectionContent> = {
  SectionContent: FC<{ data: TData }>;
  transform?: (item: MosaicDataItem, type?: string) => StackSectionItem;
  onDeleteSection?: (path: string) => void;
  onAddSection?: (path: string, position: AddSectionPosition) => void;
  onNavigateToSection?: (id: string) => void;
  collapsedSections?: CollapsedSections;
  // TODO(thure): Sections only need to know about and modify their own collapsed state. This should be improved when
  //  refactored to implement longer persistence.
  onCollapseSection?: Dispatch<SetStateAction<CollapsedSections>>;
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
  } & Pick<
    MosaicTileProps,
    'draggableProps' | 'draggableStyle' | 'onDelete' | 'onNavigate' | 'onAddAfter' | 'onAddBefore'
  > &
    Pick<StackContextValue, 'collapsedSections' | 'onCollapseSection'>
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
      active,
      draggableProps,
      draggableStyle,
      collapsedSections,
      onCollapseSection,
      onDelete,
      onNavigate,
      onAddBefore,
      onAddAfter,
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
    const sectionContentGroup = useFocusableGroup({});

    const collapsed = !!collapsedSections?.[id];

    return (
      <CollapsiblePrimitive.Root
        asChild
        open={!collapsed}
        onOpenChange={(nextOpen) => onCollapseSection?.({ ...(collapsedSections ?? {}), [id]: !nextOpen })}
      >
        <ListItem.Root
          ref={forwardedRef}
          id={id}
          classNames={['grid col-span-2 group', active === 'overlay' ? stackColumns : 'grid-cols-subgrid snap-start']}
          style={draggableStyle}
        >
          <div
            role='none'
            className={mx(
              'grid col-span-2 grid-cols-subgrid outline outline-1 outline-transparent focus-within:s-outline-separator focus-within:surface-attention',
              active && 'surface-attention after:separator-separator s-outline-separator',
              (active === 'origin' || active === 'rearrange' || active === 'destination') && 'opacity-0',
            )}
          >
            <div
              role='toolbar'
              aria-label={t('section controls label')}
              {...(!active && { tabIndex: 0 })}
              {...(!active && sectionActionsToolbar)}
              className='grid grid-cols-subgrid ch-focus-ring rounded-sm grid-rows-[min-content_min-content_1fr] m-1'
            >
              <DropdownMenu.Root
                {...{
                  open: optionsMenuOpen,
                  onOpenChange: setOptionsMenuOpen,
                }}
              >
                <DropDownMenuDragHandleTrigger active={!!active} variant='ghost' classNames='m-0' {...draggableProps}>
                  <Icon className={mx(getSize(5), 'transition-opacity')} />
                </DropDownMenuDragHandleTrigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content>
                    <DropdownMenu.Viewport>
                      <DropdownMenu.Item onClick={onAddBefore} data-testid='section.add-before'>
                        <ArrowLineUp className={mx(getSize(5), 'mr-2')} />
                        <span className='grow'>{t('add section before label')}</span>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item onClick={onAddAfter} data-testid='section.add-after'>
                        <ArrowLineDown className={mx(getSize(5), 'mr-2')} />
                        <span className='grow'>{t('add section after label')}</span>
                      </DropdownMenu.Item>
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
                <Button variant='ghost' data-state='' classNames={sectionActionDimensions}>
                  <span className='sr-only'>{t(collapsed ? 'expand label' : 'collapse label')}</span>
                  {collapsed ? <CaretUpDown className={getSize(4)} /> : <CaretDownUp className={getSize(4)} />}
                </Button>
              </CollapsiblePrimitive.Trigger>
            </div>

            {/* Main content */}

            <ListItem.Heading
              classNames={
                collapsed
                  ? ['grid grid-rows-subgrid grid-cols-subgrid items-center rounded-sm mlb-1 mie-1', focusRing]
                  : 'sr-only'
              }
              {...(collapsed && { ...sectionContentGroup, tabIndex: 0 })}
            >
              {/* TODO(thure): This needs to be made extensible; Markdown document titles especially are difficult.
                    Using `Surface` in a UI package like this would be unprecedented and needs motivation. Refactoring
                    to use subcomponents is complicated by sections being a sortable Mosaic Tile. Reevaluate when
                    work on collections (Folders, Stacks, etc) settles.
              */}
              <span className='truncate'>{title}</span>
            </ListItem.Heading>
            <CollapsiblePrimitive.Content
              {...(!collapsed && { ...sectionContentGroup, tabIndex: 0 })}
              className={mx(focusRing, 'rounded-sm mlb-1 mie-1')}
            >
              {children}
            </CollapsiblePrimitive.Content>
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
      onAddSection,
      SectionContent,
      collapsedSections,
      onCollapseSection,
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
      itemObject?.title ??
      // TODO(wittjosiah): `t` function is thinks it might not always return a string here for some reason.
      ((typeof transformedItem.placeholder === 'string'
        ? transformedItem.placeholder
        : transformedItem.placeholder
          ? t(...transformedItem.placeholder)
          : t('untitled section title')) as string);

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
        onCollapseSection={onCollapseSection}
        onDelete={() => onDeleteSection?.(path)}
        onNavigate={() => onNavigateToSection?.(itemObject.id)}
        onAddAfter={() => onAddSection?.(path, 'after')}
        onAddBefore={() => onAddSection?.(path, 'before')}
      >
        {SectionContent && <SectionContent data={itemObject} />}
      </Section>
    );

    return active === 'overlay' ? <List>{section}</List> : section;
  },
);
