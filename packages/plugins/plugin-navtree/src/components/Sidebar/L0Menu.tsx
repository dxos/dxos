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
  type MouseEvent,
  type PropsWithChildren,
  forwardRef,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { type Node } from '@dxos/app-graph';
import { invariant } from '@dxos/invariant';
import { DxAvatar } from '@dxos/lit-ui/react';
import {
  Icon,
  ListItem,
  ScrollArea,
  type ThemedClassName,
  Tooltip,
  toLocalizedString,
  useMediaQuery,
  useTranslation,
} from '@dxos/react-ui';
import { DropdownMenu, type MenuItem, MenuProvider } from '@dxos/react-ui-menu';
import type { StackItemRearrangeHandler } from '@dxos/react-ui-stack';
import { Tabs } from '@dxos/react-ui-tabs';
import { mx } from '@dxos/react-ui-theme';
import { arrayMove } from '@dxos/util';

import { useLoadDescendents } from '../../hooks';
import { meta } from '../../meta';
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
  const [isLg] = useMediaQuery('lg');

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

const l0ItemRoot =
  'group/l0item flex w-full justify-center items-center relative data[type!="collection"]:cursor-pointer app-no-drag dx-focus-ring-group';

const l0ItemContent = 'flex justify-center items-center dx-focus-ring-group-indicator transition-colors rounded-sm';

const L0ItemRoot = forwardRef<HTMLElement, PropsWithChildren<L0ItemRootProps>>(
  ({ item, parent, path, children }, forwardedRef) => {
    const { getProps } = useNavTreeContext();
    const { id, testId } = getProps?.(item, path) ?? {};
    const type = l0ItemType(item);
    const itemPath = useMemo(() => [...path, item.id], [item.id, path]);

    const { t } = useTranslation(meta.id);
    const localizedString = toLocalizedString(item.properties.label, t);

    const handleClick = useL0ItemClick({ item, parent, path: itemPath }, type);
    const rootProps =
      type === 'tab'
        ? { value: item.id, tabIndex: 0, onClick: handleClick, 'data-testid': testId, 'data-object-id': id }
        : type !== 'collection'
          ? { onClick: handleClick, 'data-testid': testId, 'data-object-id': id }
          : { onClick: handleClick, role: 'button' };

    return (
      <Tooltip.Trigger asChild delayDuration={0} side='right' content={localizedString}>
        <Tabs.TabPrimitive
          {...(rootProps as any)}
          data-type={type}
          className={mx(l0ItemRoot, l0Breakpoints[item.properties.l0Breakpoint])}
          ref={forwardedRef}
        >
          {children}
        </Tabs.TabPrimitive>
      </Tooltip.Trigger>
    );
  },
);

export const L0ItemActiveTabIndicator = ({ classNames }: ThemedClassName<{}>) => (
  <div
    role='none'
    className={mx(
      'hidden group-aria-selected/l0item:block absolute inline-start-0 inset-block-2 is-1 bg-accentSurface rounded-ie',
      classNames,
    )}
  />
);

// TODO(burdon): Factor out pinned (non-draggable) items.
const L0Item = ({ item, parent, path, pinned, onRearrange }: L0ItemProps) => {
  const { t } = useTranslation(meta.id);
  const itemElement = useRef<HTMLElement | null>(null);
  const [closestEdge, setEdge] = useState<Edge | null>(null);
  const localizedString = toLocalizedString(item.properties.label, t);
  const hue = item.properties.hue ?? null;

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
        getData: ({ input, element }) =>
          attachClosestEdge({ id: item.id, type: 'l0Item' }, { input, element, allowedEdges: ['top', 'bottom'] }),
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
        {...(hue && { style: { background: `var(--dx-${hue}Surface)` } })}
        className={mx(
          l0ItemContent,
          pinned
            ? 'p-2 group-hover/l0item:bg-activeSurface'
            : 'is-[--l0-avatar-size] bs-[--l0-avatar-size] bg-activeSurface',
        )}
      >
        <ItemAvatar item={item} />
      </div>
      <L0ItemActiveTabIndicator />
      <span id={`${item.id}__label`} className='sr-only'>
        {localizedString}
      </span>
      {closestEdge && <ListItem.DropIndicator edge={closestEdge} />}
    </L0ItemRoot>
  );
};

const ItemAvatar = ({ item }: Pick<L0ItemProps, 'item'>) => {
  const { t } = useTranslation(meta.id);
  const type = l0ItemType(item);
  if (item.properties.icon) {
    const hue = item.properties.hue ?? null;
    const hueFgStyle = hue && { style: { color: `var(--dx-${hue}SurfaceText)` } };
    return <Icon icon={item.properties.icon} size={6} {...hueFgStyle} />;
  }

  if (type === 'tab' && item.properties.disposition !== 'pin-end') {
    const hue = item.properties.hue ?? null;
    const localizedString = toLocalizedString(item.properties.label, t);
    return <DxAvatar hue={hue} hueVariant='surface' variant='square' size={12} fallback={localizedString} />;
  }

  return null;
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
      data-object-id={id}
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
  userAccountItem?: Node<any>;
  parent?: Node<any>;
  path: string[];
};

export const L0Menu = ({ menuActions, topLevelItems, pinnedItems, userAccountItem, parent, path }: L0MenuProps) => {
  const { t } = useTranslation(meta.id);

  return (
    <Tabs.Tablist
      classNames={[
        'group/l0 absolute z-[1] inset-block-0 inline-start-0 rounded-is',
        'grid grid-cols-[var(--l0-size)] grid-rows-[var(--rail-size)_1fr_min-content_var(--l0-size)] contain-layout',
        '!is-[--l0-size] bg-baseSurface border-ie border-subduedSeparator app-drag pbe-[env(safe-area-inset-bottom)]',
      ]}
    >
      {/* TODO(wittjosiah): Use L0Item trigger. */}
      <MenuProvider>
        <DropdownMenu.Root group={parent} items={menuActions}>
          <Tooltip.Trigger content={t('app menu label')} side='right' asChild>
            <Tabs.TabPrimitive value='options' asChild role='button'>
              <DropdownMenu.Trigger
                data-testid='spacePlugin.addSpace'
                className={mx(l0ItemRoot, 'grid place-items-center dx-focus-ring-group')}
              >
                <div
                  role='none'
                  className={mx(
                    l0ItemContent,
                    'is-[--rail-action] bs-[--rail-action] group-hover/l0item:bg-hoverSurface',
                  )}
                >
                  <Icon icon='ph--list--regular' size={5} />
                </div>
              </DropdownMenu.Trigger>
            </Tabs.TabPrimitive>
          </Tooltip.Trigger>
        </DropdownMenu.Root>
      </MenuProvider>

      {/* Space list. */}
      <ScrollArea.Root>
        <ScrollArea.Viewport>
          <div
            role='none'
            className={mx([
              'flex flex-col gap-1 pbs-1',
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

      {/* Actions. */}
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
              size={10}
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
