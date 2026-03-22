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
import { useAtomValue } from '@effect-atom/atom-react';
import React, {
  type MouseEvent,
  type PropsWithChildren,
  forwardRef,
  memo,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { type Node } from '@dxos/app-graph';
import { DxAvatar } from '@dxos/lit-ui/react';
import { useActionRunner } from '@dxos/plugin-graph';
import {
  Icon,
  IconButton,
  ListItem,
  ScrollArea,
  type ThemedClassName,
  Tooltip,
  toLocalizedString,
  useMediaQuery,
  useTranslation,
} from '@dxos/react-ui';
import { Menu, type MenuItem } from '@dxos/react-ui-menu';
import type { StackItemRearrangeHandler } from '@dxos/react-ui-stack';
import { Tabs } from '@dxos/react-ui-tabs';
import { mx } from '@dxos/ui-theme';
import { arrayMove } from '@dxos/util';

import { useNavTreeState } from '../../hooks';
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
  item: Node.Node;
  parent?: Node.Node;
  path: string[];
  onMouseEnter?: () => void;
};

type L0ItemProps = L0ItemRootProps & {
  item: Node.Node;
  parent?: Node.Node;
  path: string[];
  pinned?: boolean;
  onRearrange?: StackItemRearrangeHandler<L0ItemData>;
  onItemHover?: (params: { item: Node.Node }) => void;
};

const useL0ItemClick = ({ item, parent, path }: L0ItemProps, type: string) => {
  const { onSelect, onTabChange } = useNavTreeContext();
  const { getItem } = useNavTreeState();
  const [isLg] = useMediaQuery('lg');
  const runAction = useActionRunner();

  return useCallback(
    (event: MouseEvent) => {
      switch (type) {
        case 'action': {
          const { properties: { caller } = {} } = item;
          return void runAction(item as Node.Action, caller ? { parent, path, caller } : { parent, path });
        }
        case 'tab':
          return onTabChange?.(item);
        case 'link':
          return onSelect?.({ item, path, current: !getItem(path).current, option: event.altKey });
      }
    },
    [item, parent, type, getItem, onSelect, onTabChange, isLg, runAction],
  );
};

const l0Breakpoints: Record<string, string> = {
  lg: 'hidden lg:grid',
};

const L0ItemRoot = memo(
  forwardRef<HTMLButtonElement, PropsWithChildren<L0ItemRootProps>>(
    ({ item, parent, path, onMouseEnter, children }, forwardedRef) => {
      const { t } = useTranslation(meta.id);
      const { model } = useNavTreeContext();
      const itemPath = useMemo(() => [...path, item.id], [item.id, path]);
      const { id, testId } = useAtomValue(model.itemProps(itemPath));
      const localizedString = toLocalizedString(item.properties.label, t);

      const type = l0ItemType(item);
      const handleClick = useL0ItemClick({ item, parent, path: itemPath }, type);

      return (
        <Tooltip.Trigger asChild delayDuration={0} side='right' content={localizedString}>
          <Tabs.TabPrimitive
            className={mx(
              'group/l0item flex w-full justify-center items-center relative',
              'dx-app-no-drag dx-focus-ring-group data[type!="collection"]:cursor-pointer',
              l0Breakpoints[item.properties.l0Breakpoint],
            )}
            tabIndex={type === 'tab' ? 0 : undefined}
            data-type={type}
            data-testid={testId}
            data-object-id={id}
            value={item.id}
            onClick={handleClick}
            onMouseEnter={onMouseEnter}
            ref={forwardedRef}
          >
            {children}
          </Tabs.TabPrimitive>
        </Tooltip.Trigger>
      );
    },
  ),
);

export const L0ItemActiveTabIndicator = ({ classNames }: ThemedClassName<{}>) => (
  <div
    role='none'
    className={mx(
      'hidden group-aria-selected/l0item:block absolute start-0 h-6 w-1.5 bg-accent-surface rounded-sm',
      classNames,
    )}
  />
);

// TODO(burdon): Factor out pinned (non-draggable) items.
const L0Item = memo(({ item, parent, path, pinned, onRearrange, onItemHover }: L0ItemProps) => {
  const { t } = useTranslation(meta.id);
  const itemElement = useRef<HTMLButtonElement | null>(null);
  const [closestEdge, setEdge] = useState<Edge | null>(null);
  const localizedString = toLocalizedString(item.properties.label, t);
  const hue = item.properties.hue ?? null;

  useLayoutEffect(() => {
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

  const handleMouseEnter = useCallback(() => onItemHover?.({ item }), [item, onItemHover]);

  return (
    <L0ItemRoot ref={itemElement} item={item} parent={parent} path={path} onMouseEnter={handleMouseEnter}>
      <div
        role='none'
        data-frame={true}
        {...(hue && { style: { background: `var(--color-${hue}-surface)` } })}
        className={mx(
          'flex justify-center items-center dx-focus-ring-group-indicator transition-colors rounded-sm',
          pinned
            ? 'p-2 group-hover/l0item:bg-active-surface'
            : 'w-(--dx-l0-avatar-size) h-(--dx-l0-avatar-size) bg-active-surface',
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
});

const ItemAvatar = ({ item }: Pick<L0ItemProps, 'item'>) => {
  const { t } = useTranslation(meta.id);

  // Actions.
  if (item.properties.icon) {
    const hue = item.properties.hue ?? null;
    const hueFgStyle = hue && { style: { color: `var(--color-${hue}-surface-text)` } };
    return <Icon icon={item.properties.icon} size={6} {...hueFgStyle} />;
  }

  const type = l0ItemType(item);
  if (type === 'tab' && item.properties.disposition !== 'pin-end') {
    const hue = item.properties.hue ?? null;
    const localizedString = toLocalizedString(item.properties.label, t);
    return <DxAvatar hue={hue} hueVariant='surface' variant='square' size={12} fallback={localizedString} />;
  }

  return null;
};

//
// L0Menu
//

export type L0MenuProps = {
  menuActions: MenuItem[];
  topLevelItems: Node.Node[];
  pinnedItems: Node.Node[];
  userAccountItem?: Node.Node;
  parent?: Node.Node;
  path: string[];
  onItemHover?: (params: { item: Node.Node }) => void;
};

export const L0Menu = ({
  menuActions,
  topLevelItems,
  pinnedItems,
  userAccountItem,
  parent,
  path,
  onItemHover,
}: L0MenuProps) => {
  const { t } = useTranslation(meta.id);
  const runAction = useActionRunner();
  const handleAction = useCallback(
    (action: Node.Action, params: Node.InvokeProps) => {
      void runAction(action, params);
    },
    [runAction],
  );

  const handleRearrange = useCallback<StackItemRearrangeHandler<L0ItemData>>(
    (source, target, closestEdge) => {
      const sourceItem = topLevelItems.find((i) => i.id === source.id);
      if (!sourceItem?.properties.onRearrange) {
        return;
      }

      const sourceIndex = topLevelItems.findIndex((i) => i.id === source.id);
      const targetIndex = topLevelItems.findIndex((i) => i.id === target.id);
      const insertIndex =
        source.id === target.id
          ? sourceIndex
          : targetIndex +
            (sourceIndex < targetIndex ? (closestEdge === 'top' ? -1 : 0) : closestEdge === 'bottom' ? 1 : 0);
      const nextOrder = arrayMove([...topLevelItems], sourceIndex, insertIndex);
      return sourceItem.properties.onRearrange(nextOrder.map((item) => item.data));
    },
    [topLevelItems],
  );

  // Check if any items have onRearrange to enable drag-and-drop.
  const hasRearrangeableItems = topLevelItems.some((item) => item.properties.onRearrange);

  return (
    <Tabs.Tablist
      classNames={[
        'group/l0 absolute z-[1] inset-y-0 start-0 rounded-is',
        'grid grid-cols-[var(--dx-l0-size)] grid-rows-[var(--dx-rail-size)_1fr_min-content_var(--dx-l0-size)] dx-contain-layout',
        'w-(--dx-l0-size) bg-toolbar-surface dx-app-drag pb-[env(safe-area-inset-bottom)]',
        '[body[data-platform="macos"]_&]:pt-[30px]',
        '[body[data-platform="ios"]_&]:pt-[max(env(safe-area-inset-top),0.25rem)]',
      ]}
    >
      {/* TODO(wittjosiah): Use L0Item trigger. */}
      <Menu.Root onAction={handleAction}>
        <Menu.Trigger asChild data-testid='spacePlugin.addSpace'>
          <div role='none' className='grid place-items-center'>
            <IconButton variant='ghost' icon='ph--list--regular' iconOnly label={t('app menu label')} />
          </div>
        </Menu.Trigger>
        <Menu.Content group={parent} items={menuActions} />
      </Menu.Root>

      {/* Space list. */}
      <ScrollArea.Root margin thin orientation='vertical'>
        <ScrollArea.Viewport classNames='flex flex-col gap-2 py-1'>
          {topLevelItems.map((item) => (
            <L0Item
              key={item.id}
              item={item}
              parent={parent}
              path={path}
              onItemHover={onItemHover}
              {...(hasRearrangeableItems && { onRearrange: handleRearrange })}
            />
          ))}
        </ScrollArea.Viewport>
      </ScrollArea.Root>

      {/* Actions. */}
      <div role='none' className='grid grid-cols-1 auto-rows-(--dx-rail-action) pt-2'>
        {pinnedItems.map((item) => (
          <L0Item key={item.id} item={item} parent={parent} path={path} pinned />
        ))}
      </div>

      {userAccountItem && (
        <div role='none' className='grid dx-app-no-drag'>
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
    </Tabs.Tablist>
  );
};
