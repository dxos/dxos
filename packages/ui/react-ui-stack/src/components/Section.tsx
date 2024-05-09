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
  type ComponentPropsWithRef,
} from 'react';

import {
  Button,
  DropdownMenu,
  List,
  ListItem,
  Toolbar,
  useTranslation,
  type TFunction,
  type ThemedClassName,
  ScrollArea,
  toLocalizedString,
  type Label,
  isLabel,
} from '@dxos/react-ui';
import { DropDownMenuDragHandleTrigger, resizeHandle, resizeHandleHorizontal } from '@dxos/react-ui-deck';
import {
  type MosaicActiveType,
  type MosaicDataItem,
  type MosaicTileComponent,
  type MosaicTileProps,
  useMosaic,
} from '@dxos/react-ui-mosaic';
import {
  focusRing,
  getSize,
  hoverableControlItem,
  hoverableControls,
  hoverableFocusedWithinControls,
  mx,
} from '@dxos/react-ui-theme';

import { CaretDownUp } from './CaretDownUp';
import { stackColumns } from './style-fragments';
import { translationKey } from '../translations';

const sectionActionDimensions = 'p-1 shrink-0 min-bs-0 is-[--rail-action] bs-min';

export type StackSectionContent = MosaicDataItem;

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
  size?: SectionSize;
  icon?: FC<IconProps>;
  placeholder?: string | [string, Parameters<TFunction>[1]];
  label?: ((data: any) => string | undefined) | Label;
  isResizable?: boolean;
};

export type StackSectionItemWithContext = StackSectionItem & StackContextValue;

export type SectionSize = 'intrinsic' | 'extrinsic';

export type SectionProps = PropsWithChildren<
  {
    // Data props.
    id: string;
    title: string;
    separation: boolean;
    icon?: FC<IconProps>;
    size?: SectionSize;

    // Tile props.
    active?: MosaicActiveType;
  } & Pick<
    MosaicTileProps,
    'draggableProps' | 'draggableStyle' | 'onDelete' | 'onNavigate' | 'onAddAfter' | 'onAddBefore'
  > &
    Pick<StackContextValue, 'collapsedSections' | 'onCollapseSection'> &
    Pick<StackSectionItem, 'isResizable'>
>;

const resizeHandleStyles = mx(resizeHandle, resizeHandleHorizontal, 'is-full bs-[--rail-action] col-start-2');

export const Section: ForwardRefExoticComponent<SectionProps & RefAttributes<HTMLLIElement>> = forwardRef<
  HTMLLIElement,
  SectionProps
>(
  (
    {
      id,
      title,
      icon: Icon = DotsNine,
      size = 'intrinsic',
      active,
      isResizable,
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
          classNames={[
            'grid col-span-2 group/section',
            active === 'overlay' ? stackColumns : 'grid-cols-subgrid snap-start',
          ]}
          style={draggableStyle}
        >
          <div
            role='none'
            className={mx(
              'grid col-span-2 grid-cols-subgrid outline outline-1 outline-transparent mlb-px surface-base focus-within:s-outline-separator focus-within:surface-attention',
              hoverableControls,
              hoverableFocusedWithinControls,
              active && 'surface-attention after:separator-separator s-outline-separator',
              (active === 'origin' || active === 'rearrange' || active === 'destination') && 'opacity-0',
            )}
          >
            <div
              role='toolbar'
              aria-orientation='vertical'
              aria-label={t('section controls label')}
              {...(!active && { tabIndex: 0 })}
              {...(!active && sectionActionsToolbar)}
              className='grid grid-cols-subgrid ch-focus-ring rounded-sm grid-rows-[min-content_min-content_1fr] m-1 group-has-[[role=toolbar][aria-orientation=horizontal]]/section:pbs-[--rail-action]'
            >
              <div role='none' className='sticky -block-start-px bg-[--sticky-bg]'>
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
            {size === 'intrinsic' ? (
              <CollapsiblePrimitive.Content
                {...(!collapsed && {
                  ...sectionContentGroup,
                  tabIndex: 0,
                })}
                className={mx('mlb-1 mie-1 rounded-sm', focusRing)}
              >
                {children}
              </CollapsiblePrimitive.Content>
            ) : (
              <CollapsiblePrimitive.Content asChild>
                <ScrollArea.Root
                  type='always'
                  {...(!collapsed && { ...sectionContentGroup, tabIndex: 0 })}
                  classNames={mx(
                    focusRing,
                    'rounded-sm mlb-1 mie-1 is-full has-[[data-radix-scroll-area-viewport]]:pbe-4',
                  )}
                >
                  <ScrollArea.Viewport>{children}</ScrollArea.Viewport>
                  <ScrollArea.Scrollbar
                    orientation='horizontal'
                    variant='coarse'
                    classNames='hidden has-[div]:flex !inline-end-[max(.25rem,var(--radix-scroll-area-corner-width))]'
                  >
                    <ScrollArea.Thumb />
                  </ScrollArea.Scrollbar>
                  <ScrollArea.Scrollbar orientation='vertical' variant='coarse' classNames='hidden has-[div]:flex'>
                    <ScrollArea.Thumb />
                  </ScrollArea.Scrollbar>
                  <ScrollArea.Corner />
                </ScrollArea.Root>
              </CollapsiblePrimitive.Content>
            )}
          </div>
          {isResizable && !collapsed && (
            <button className={resizeHandleStyles}>
              <span className='sr-only'>{t('resize section label')}</span>
            </button>
          )}
        </ListItem.Root>
      </CollapsiblePrimitive.Root>
    );
  },
);

export type SectionToolbarProps = ThemedClassName<ComponentPropsWithRef<'div'>>;

export const sectionToolbarLayout = 'bs-[--rail-action] bg-[--sticky-bg] sticky -block-start-px transition-opacity';

export const SectionToolbar = ({ children, classNames }: SectionToolbarProps) => {
  return (
    <Toolbar.Root orientation='horizontal' classNames={[sectionToolbarLayout, hoverableControlItem, classNames]}>
      {children}
    </Toolbar.Root>
  );
};

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
      isResizable,
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

    const title: string =
      (typeof transformedItem.label === 'function' ? transformedItem.label(itemObject) : undefined) ??
      (isLabel(transformedItem.label)
        ? toLocalizedString(transformedItem.label as Label, t)
        : isLabel(transformedItem.placeholder)
          ? toLocalizedString(transformedItem.placeholder, t)
          : t('untitled section title'));

    const section = (
      <Section
        ref={forwardedRef}
        title={title}
        id={transformedItem.id}
        size={transformedItem.size}
        icon={transformedItem.icon}
        separation={separation}
        active={active}
        draggableProps={draggableProps}
        draggableStyle={draggableStyle}
        collapsedSections={collapsedSections}
        onCollapseSection={onCollapseSection}
        isResizable={isResizable}
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
