//
// Copyright 2025 DXOS.org
//

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { preserveOffsetOnSource } from '@atlaskit/pragmatic-drag-and-drop/element/preserve-offset-on-source';
import { scrollJustEnoughIntoView } from '@atlaskit/pragmatic-drag-and-drop/element/scroll-just-enough-into-view';
import {
  type Edge,
  attachClosestEdge,
  extractClosestEdge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import React, {
  forwardRef,
  type MouseEvent,
  type PropsWithChildren,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { type Node } from '@dxos/app-graph';
import { invariant } from '@dxos/invariant';
import {
  Icon,
  IconButton,
  ListItem,
  ScrollArea,
  Tooltip,
  toLocalizedString,
  useMediaQuery,
  useTranslation,
} from '@dxos/react-ui';
import { MenuProvider, DropdownMenu, type MenuItem } from '@dxos/react-ui-menu';
import type { StackItemRearrangeHandler } from '@dxos/react-ui-stack';
import { Tabs } from '@dxos/react-ui-tabs';
import { mx } from '@dxos/react-ui-theme';
import { arrayMove, getFirstTwoRenderableChars } from '@dxos/util';

import { useLoadDescendents } from '../../hooks';
import { NAVTREE_PLUGIN } from '../../meta';
import { l0ItemType } from '../../util';
import { useNavTreeContext } from '../NavTreeContext';
import { UserAccountAvatar } from '../UserAccountAvatar';

//
// L0Item
//

type L0ItemData = {
  id: L0ItemProps['item']['id'];
  type: 'l0Item';
};

type L0ItemRootProps = {
  item: Node<any>;
  parent?: Node<any>;
  path: string[];
};

type L0ItemProps = L0ItemRootProps & {
  item: Node<any>;
  parent?: Node<any>;
  path: string[];
  pinned?: boolean;
  onRearrange?: StackItemRearrangeHandler<L0ItemData>;
};

const useL0ItemClick = ({ item, parent, path }: L0ItemProps, type: string) => {
  const { tab, isCurrent, onSelect, onTabChange } = useNavTreeContext();
  const [isLg] = useMediaQuery('lg', { ssr: false });

  return useCallback(
    (event: MouseEvent) => {
      switch (type) {
        case 'action': {
          const {
            data: invoke,
            properties: { caller },
          } = item;

          return invoke?.(caller ? { node: parent, caller } : { node: parent });
        }

        case 'tab':
          return onTabChange?.(item);

        case 'link':
          return onSelect?.({ item, path, current: !isCurrent(path, item), option: event.altKey });
      }
    },
    [item, parent, type, tab, isCurrent, onSelect, onTabChange, isLg],
  );
};

const l0Breakpoints: Record<string, string> = {
  lg: 'hidden lg:grid',
};

const L0ItemRoot = forwardRef<HTMLElement, PropsWithChildren<L0ItemRootProps>>(
  ({ item, parent, path, children }, forwardedRef) => {
    const { getProps } = useNavTreeContext();
    const { id, testId } = getProps?.(item, path) ?? {};
    const type = l0ItemType(item);
    const itemPath = useMemo(() => [...path, item.id], [item.id, path]);

    const { t } = useTranslation(NAVTREE_PLUGIN);
    const localizedString = toLocalizedString(item.properties.label, t);

    const handleClick = useL0ItemClick({ item, parent, path: itemPath }, type);
    const rootProps =
      type === 'tab'
        ? { value: item.id, tabIndex: 0, onClick: handleClick, 'data-testid': testId, 'data-itemid': id }
        : type !== 'collection'
          ? { onClick: handleClick, 'data-testid': testId, 'data-itemid': id }
          : { onClick: handleClick };

    const Root = type === 'collection' ? 'h2' : type === 'tab' ? Tabs.TabPrimitive : 'button';

    return (
      <Tooltip.Trigger asChild delayDuration={0} side='right' content={localizedString}>
        <Root
          {...(rootProps as any)}
          data-type={type}
          className={mx(
            'group/l0item flex w-full justify-center items-center relative data[type!="collection"]:cursor-pointer app-no-drag dx-focus-ring-group',
            l0Breakpoints[item.properties.l0Breakpoint],
          )}
          ref={forwardedRef}
        >
          {children}
        </Root>
      </Tooltip.Trigger>
    );
  },
);

const L0Avator = ({ item }: Pick<L0ItemProps, 'item'>) => {
  const { t } = useTranslation(NAVTREE_PLUGIN);
  const type = l0ItemType(item);
  const hue = item.properties.hue ?? null;
  const hueFgStyle = hue && { style: { color: `var(--dx-${hue}SurfaceText)` } };
  const localizedString = toLocalizedString(item.properties.label, t);
  const avatarValue = useMemo(
    () => (type === 'tab' ? getFirstTwoRenderableChars(localizedString).join('').toUpperCase() : []),
    [type, item.properties.label, t],
  );

  return (
    <span role='img' className='place-self-center text-xl font-light' {...hueFgStyle}>
      {avatarValue}
    </span>
  );
};

// TODO(burdon): Factor out pinned (non-draggable) items.
const L0Item = ({ item, parent, path, pinned, onRearrange }: L0ItemProps) => {
  const { t } = useTranslation(NAVTREE_PLUGIN);
  const itemElement = useRef<HTMLElement | null>(null);
  const [closestEdge, setEdge] = useState<Edge | null>(null);
  const type = l0ItemType(item);
  const localizedString = toLocalizedString(item.properties.label, t);
  const hue = item.properties.hue ?? null;
  const hueFgStyle = hue && { style: { color: `var(--dx-${hue}SurfaceText)` } };

  useLayoutEffect(() => {
    // NOTE(thure): This is copied from StackItem, perhaps this should be DRYed out.
    if (!itemElement.current || !onRearrange) {
      return;
    }

    return combine(
      draggable({
        element: itemElement.current,
        getInitialData: () => ({ id: item.id, type: 'l0Item' }) satisfies L0ItemData,
        onGenerateDragPreview: ({ nativeSetDragImage, source, location }) => {
          document.body.setAttribute('data-drag-preview', 'true');
          const element = source.element.querySelector('[data-frame]') as HTMLElement;
          scrollJustEnoughIntoView({ element });
          const { x, y } = preserveOffsetOnSource({ element, input: location.current.input })({
            container: (element.offsetParent ?? document.body) as HTMLElement,
          });
          nativeSetDragImage?.(element, x, y);
        },
        onDragStart: () => {
          document.body.removeAttribute('data-drag-preview');
          itemElement.current!.closest('[data-drag-autoscroll]')?.setAttribute('data-drag-autoscroll', 'active');
        },
        onDrop: () => {
          itemElement.current!.closest('[data-drag-autoscroll]')?.setAttribute('data-drag-autoscroll', 'idle');
        },
      }),
      dropTargetForElements({
        element: itemElement.current,
        getData: ({ input, element }) => {
          return attachClosestEdge(
            { id: item.id, type: 'l0Item' },
            { input, element, allowedEdges: ['top', 'bottom'] },
          );
        },
        onDragEnter: ({ self, source }) => {
          if (source.data.type === self.data.type) {
            setEdge(extractClosestEdge(self.data));
          }
        },
        onDrag: ({ self, source }) => {
          if (source.data.type === self.data.type) {
            setEdge(extractClosestEdge(self.data));
          }
        },
        onDragLeave: () => setEdge(null),
        onDrop: ({ self, source }) => {
          setEdge(null);
          if (source.data.type === self.data.type) {
            onRearrange(source.data as L0ItemData, self.data as L0ItemData, extractClosestEdge(self.data));
          }
        },
      }),
    );
  }, [item, onRearrange]);

  return (
    <L0ItemRoot ref={itemElement} item={item} parent={parent} path={path}>
      <div
        role='none'
        data-frame={true}
        className={mx(
          'flex justify-center items-center dx-focus-ring-group-indicator transition-colors rounded',
          // TODO(burdon): Create reusable button/component and/or create var for size.
          pinned
            ? 'bg-transparent w-[50px] p-2 group-hover/l0item:bg-activeSurface'
            : 'bg-activeSurface w-[50px] h-[50px]',
        )}
        {...(hue && { style: { background: `var(--dx-${hue}Surface)` } })}
      >
        {(item.properties.icon && <Icon icon={item.properties.icon} size={pinned ? 5 : 6} {...hueFgStyle} />) ||
          (type === 'tab' && item.properties.disposition !== 'pin-end' && <L0Avator item={item} />)}
      </div>
      <div
        role='none'
        className='hidden group-aria-selected/l0item:block absolute inline-start-0 inset-block-4 is-1 bg-accentSurface rounded-ie'
      />
      <span id={`${item.id}__label`} className='sr-only'>
        {localizedString}
      </span>
      {onRearrange && closestEdge && <ListItem.DropIndicator edge={closestEdge} />}
    </L0ItemRoot>
  );
};

//
// L0Collection
//

const L0Collection = ({ item, path }: L0ItemProps) => {
  const navTreeContext = useNavTreeContext();
  useLoadDescendents(item);
  const collectionItems = navTreeContext.useItems(item);
  const groupPath = useMemo(() => [...path, item.id], [item.id, path]);
  const { id, testId } = navTreeContext.getProps?.(item, path) ?? {};
  const handleRearrange = useCallback<StackItemRearrangeHandler<L0ItemData>>(
    (source, target, closestEdge) => {
      invariant(item.properties.onRearrangeChildren);
      const sourceIndex = collectionItems.findIndex((i) => i.id === source.id);
      const targetIndex = collectionItems.findIndex((i) => i.id === target.id);
      const insertIndex =
        source.id === target.id
          ? sourceIndex
          : targetIndex +
            (sourceIndex < targetIndex ? (closestEdge === 'top' ? -1 : 0) : closestEdge === 'bottom' ? 1 : 0);
      const nextOrder = arrayMove([...collectionItems], sourceIndex, insertIndex);
      return item.properties.onRearrangeChildren(nextOrder);
    },
    [collectionItems, item.properties.onRearrangeChildren],
  );

  return (
    <div
      role='group'
      className='contents group/l0c'
      aria-labelledby={`${item.id}__label`}
      data-itemid={id}
      data-testid={testId}
    >
      {collectionItems.map((collectionItem) => (
        <L0Item
          key={collectionItem.id}
          item={collectionItem}
          parent={item}
          path={groupPath}
          {...(item.properties.onRearrangeChildren && { onRearrange: handleRearrange })}
        />
      ))}
    </div>
  );
};

//
// L0Menu
//

export type L0MenuProps = {
  menuActions: MenuItem[];
  topLevelItems: Node<any>[];
  pinnedItems: Node<any>[];
  userAccountItem: Node<any>;
  parent?: Node<any>;
  path: string[];
};

export const L0Menu = ({ menuActions, topLevelItems, pinnedItems, userAccountItem, parent, path }: L0MenuProps) => {
  const { t } = useTranslation(NAVTREE_PLUGIN);

  return (
    <Tabs.Tablist
      classNames={[
        'group/l0 absolute z-[1] inset-block-0 inline-start-0 rounded-is-lg',
        'grid grid-cols-[var(--l0-size)] grid-rows-[var(--rail-size)_1fr_min-content_var(--l0-size)] gap-1 contain-layout',
        '!is-[--l0-size] bg-baseSurface border-ie border-separator app-drag pbe-[env(safe-area-inset-bottom)]',
      ]}
    >
      <div role='none' className='flex justify-center p-1'>
        <MenuProvider>
          <DropdownMenu.Root group={parent} items={menuActions}>
            <DropdownMenu.Trigger asChild>
              {/* TODO(wittjosiah): Use L0Item trigger. */}
              {/* TODO(burdon): Replace with Sigil. */}
              <IconButton
                iconOnly
                icon='ph--dots-three--regular'
                size={5}
                label={t('app menu label')}
                tooltipSide='right'
                classNames='w-[50px] _bg-primary-500'
                data-testid='spacePlugin.addSpace'
              />
            </DropdownMenu.Trigger>
          </DropdownMenu.Root>
        </MenuProvider>
      </div>

      <ScrollArea.Root>
        <ScrollArea.Viewport>
          <div
            role='none'
            className={mx([
              'flex flex-col gap-2 pbs-1',
              '[body[data-platform="darwin"]_&]:pbs-[calc(30px+0.25rem)]',
              '[body[data-platform="ios"]_&]:pbs-[max(env(safe-area-inset-top),0.25rem)]',
            ])}
          >
            {topLevelItems.map((item) => {
              if (l0ItemType(item) === 'collection') {
                return <L0Collection key={item.id} item={item} parent={parent} path={path} />;
              } else {
                return <L0Item key={item.id} item={item} parent={parent} path={path} />;
              }
            })}
          </div>
          <ScrollArea.Scrollbar orientation='vertical'>
            <ScrollArea.Thumb />
          </ScrollArea.Scrollbar>
        </ScrollArea.Viewport>
      </ScrollArea.Root>

      <div role='none' className='grid grid-cols-1 auto-rows-[--rail-action] pbs-2'>
        {pinnedItems
          .filter((item) => l0ItemType(item) !== 'collection')
          .map((item) => (
            <L0Item key={item.id} item={item} parent={parent} path={path} pinned />
          ))}
      </div>

      {userAccountItem && (
        <div role='none' className='grid app-no-drag'>
          <L0ItemRoot key={userAccountItem.id} item={userAccountItem} parent={parent} path={path}>
            <UserAccountAvatar
              userId={userAccountItem.properties.userId}
              hue={userAccountItem.properties.hue}
              emoji={userAccountItem.properties.emoji}
              status={userAccountItem.properties.status}
              size={11}
            />
          </L0ItemRoot>
        </div>
      )}

      <div
        role='none'
        className='hidden [body[data-platform="darwin"]_&]:block absolute block-start-0 is-[calc(var(--l0-size)-1px)] bs-[calc(40px+0.25rem)]'
        style={{
          background:
            'linear-gradient(to bottom, var(--dx-sidebarSurface) 0%, var(--dx-sidebarSurface) 70%, transparent 100%)',
        }}
      />
    </Tabs.Tablist>
  );
};
