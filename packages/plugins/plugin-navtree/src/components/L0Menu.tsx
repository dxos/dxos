//
// Copyright 2025 DXOS.org
//

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { preserveOffsetOnSource } from '@atlaskit/pragmatic-drag-and-drop/element/preserve-offset-on-source';
import { scrollJustEnoughIntoView } from '@atlaskit/pragmatic-drag-and-drop/element/scroll-just-enough-into-view';
import {
  attachClosestEdge,
  type Edge,
  extractClosestEdge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import React, { type MouseEvent, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { createIntent, LayoutAction, useIntentDispatcher } from '@dxos/app-framework';
import { type Node } from '@dxos/app-graph';
import { invariant } from '@dxos/invariant';
import {
  Popover,
  ScrollArea,
  toLocalizedString,
  Tooltip,
  useMediaQuery,
  useSidebars,
  useTranslation,
  ListItem,
  Icon,
} from '@dxos/react-ui';
import type { StackItemRearrangeHandler } from '@dxos/react-ui-stack';
import { Tabs } from '@dxos/react-ui-tabs';
import { mx } from '@dxos/react-ui-theme';
import { arrayMove, getFirstTwoRenderableChars } from '@dxos/util';

import { useNavTreeContext } from './NavTreeContext';
import { NotchStart } from './NotchStart';
import { useLoadDescendents } from '../hooks';
import { NAVTREE_PLUGIN } from '../meta';
import { l0ItemType } from '../util';

type L0ItemData = { id: L0ItemProps['item']['id']; type: 'l0Item' };

type L0ItemProps = {
  item: Node<any>;
  parent?: Node<any>;
  path: string[];
  pinned?: boolean;
  onRearrange?: StackItemRearrangeHandler<L0ItemData>;
};

const useL0ItemClick = ({ item, parent, path }: L0ItemProps, type: string) => {
  const { tab, onTabChange, onSelect, isCurrent } = useNavTreeContext();
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const { navigationSidebarState } = useSidebars(NAVTREE_PLUGIN);
  const [isLg] = useMediaQuery('lg', { ssr: false });

  return useCallback(
    (event: MouseEvent) => {
      switch (type) {
        case 'tab':
          // TODO(thure): This dispatch should rightly be in `onTabChange`, but that callback wasn’t reacting to changes
          //  to its dependencies.
          void dispatch(
            createIntent(LayoutAction.UpdateSidebar, {
              part: 'sidebar',
              options: {
                state:
                  item.id === tab
                    ? navigationSidebarState === 'expanded'
                      ? isLg
                        ? 'collapsed'
                        : 'closed'
                      : 'expanded'
                    : 'expanded',
              },
            }),
          );
          return onTabChange?.(item);
        case 'link':
          return onSelect?.({ item, path, current: !isCurrent(path, item), option: event.altKey });
        case 'action': {
          const {
            data: invoke,
            properties: { caller },
          } = item;
          return invoke?.(caller ? { node: parent, caller } : { node: parent });
        }
      }
    },
    [item, type, onSelect, isCurrent, parent, tab, navigationSidebarState, isLg, dispatch],
  );
};

const l0Breakpoints: Record<string, string> = {
  lg: 'hidden lg:grid',
};

const L0Item = ({ item, parent, path, pinned, onRearrange }: L0ItemProps) => {
  const { t } = useTranslation(NAVTREE_PLUGIN);
  const itemElement = useRef<HTMLElement | null>(null);
  const [closestEdge, setEdge] = useState<Edge | null>(null);
  const type = l0ItemType(item);
  const itemPath = useMemo(() => [...path, item.id], [item.id, path]);
  const { getProps, popoverAnchorId } = useNavTreeContext();
  const { id, testId } = getProps?.(item, path) ?? {};
  const Root = type === 'collection' ? 'h2' : type === 'tab' ? Tabs.TabPrimitive : 'button';
  const handleClick = useL0ItemClick({ item, path: itemPath, parent }, type);
  const rootProps =
    type === 'tab'
      ? { value: item.id, tabIndex: 0, onClick: handleClick, 'data-testid': testId, 'data-itemid': id }
      : type !== 'collection'
        ? { onClick: handleClick, 'data-testid': testId, 'data-itemid': id }
        : { onClick: handleClick };
  const localizedString = toLocalizedString(item.properties.label, t);
  const hue = item.properties.hue ?? null;
  const avatarValue = useMemo(
    () => (type === 'tab' ? getFirstTwoRenderableChars(localizedString).join('').toUpperCase() : []),
    [type, item.properties.label, t],
  );
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

  const l0ItemTrigger = (
    <Root
      {...(rootProps as any)}
      data-type={type}
      className={mx(
        'group/l0i dx-focus-ring-group grid relative data[type!="collection"]:cursor-pointer app-no-drag',
        l0Breakpoints[item.properties.l0Breakpoint],
      )}
      ref={itemElement}
    >
      <div
        role='none'
        data-frame={true}
        className={mx(
          'absolute grid dx-focus-ring-group-indicator transition-colors',
          type === 'tab' || pinned ? 'rounded' : 'rounded-full',
          pinned
            ? 'bg-transparent group-hover/l0i:bg-groupSurface inset-inline-3 inset-block-0.5'
            : 'bg-groupSurface inset-inline-3 inset-block-2',
        )}
        {...(hue && { style: { background: `var(--dx-${hue}Surface)` } })}
      >
        {(item.properties.icon && (
          <Icon icon={item.properties.icon} size={pinned ? 5 : 7} classNames='place-self-center' {...hueFgStyle} />
        )) ||
          (type === 'tab' && item.properties.disposition !== 'pin-end' ? (
            <span role='img' className='place-self-center text-3xl font-light' {...hueFgStyle}>
              {avatarValue}
            </span>
          ) : (
            item.properties.icon && (
              <Icon icon='ph--planet--regular' size={pinned ? 5 : 7} classNames='place-self-center' {...hueFgStyle} />
            )
          ))}
      </div>
      <div
        role='none'
        className='hidden group-aria-selected/l0i:block absolute inline-start-0 inset-block-4 is-1 bg-accentSurface rounded-ie'
      />
      <span id={`${item.id}__label`} className='sr-only'>
        {localizedString}
      </span>
      {onRearrange && closestEdge && <ListItem.DropIndicator edge={closestEdge} />}
    </Root>
  );

  return popoverAnchorId === id ? (
    <Popover.Anchor asChild>{l0ItemTrigger}</Popover.Anchor>
  ) : (
    <Tooltip.Root delayDuration={0}>
      <Tooltip.Trigger asChild>{l0ItemTrigger}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side='right'>
          {localizedString}
          <Tooltip.Arrow />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
};

const L0Collection = ({ item, path, parent }: L0ItemProps) => {
  const navTreeContext = useNavTreeContext();
  useLoadDescendents(item);
  const collectionItems = navTreeContext.getItems(item);
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

export const L0Menu = ({
  topLevelItems,
  pinnedItems,
  parent,
  path,
}: {
  topLevelItems: Node<any>[];
  pinnedItems: Node<any>[];
  parent?: Node<any>;
  path: string[];
}) => {
  return (
    <Tabs.Tablist classNames='group/l0 absolute z-[1] inset-block-0 inline-start-0 rounded-is-lg grid grid-cols-[var(--l0-size)] grid-rows-[1fr_min-content_var(--l0-size)] contain-layout !is-[--l0-size] bg-baseSurface border-ie border-separator app-drag  pbe-[env(safe-area-inset-bottom)]'>
      <ScrollArea.Root>
        <ScrollArea.Viewport>
          <div
            role='none'
            className='grid auto-rows-[calc(var(--l0-size)-.5rem)] plb-1 [body[data-platform="darwin"]_&]:pbs-[calc(30px+0.25rem)] [body[data-platform="ios"]_&]:pbs-[max(env(safe-area-inset-top),0.25rem)]'
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
      <div role='none' className='grid p-2 app-no-drag'>
        <NotchStart />
      </div>
      <div
        role='none'
        className='hidden [body[data-platform="darwin"]_&]:block absolute block-start-0 is-[calc(var(--l0-size)-1px)] bs-[calc(40px+0.25rem)]'
        style={{
          background:
            'linear-gradient(to bottom, var(--dx-baseSurface) 0%, var(--dx-baseSurface) 70%, transparent 100%)',
        }}
      />
    </Tabs.Tablist>
  );
};
