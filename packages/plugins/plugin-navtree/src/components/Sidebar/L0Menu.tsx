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
};

type L0ItemProps = L0ItemRootProps & {
  item: Node.Node;
  parent?: Node.Node;
  path: string[];
  pinned?: boolean;
  onRearrange?: StackItemRearrangeHandler<L0ItemData>;
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
          return void runAction(item as Node.Action, caller ? { parent, caller } : { parent });
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

const l0ItemRoot =
  'group/l0item flex w-full justify-center items-center relative data[type!="collection"]:cursor-pointer app-no-drag dx-focus-ring-group';

const l0ItemContent = 'flex justify-center items-center dx-focus-ring-group-indicator transition-colors rounded-sm';

const L0ItemRoot = memo(
  forwardRef<HTMLElement, PropsWithChildren<L0ItemRootProps>>(({ item, parent, path, children }, forwardedRef) => {
    const { model } = useNavTreeContext();
    const itemPath = useMemo(() => [...path, item.id], [item.id, path]);
    const { id, testId } = useAtomValue(model.itemProps(itemPath));
    const type = l0ItemType(item);

    const { t } = useTranslation(meta.id);
    const localizedString = toLocalizedString(item.properties.label, t);

    const handleClick = useL0ItemClick({ item, parent, path: itemPath }, type);
    const rootProps =
      type === 'tab'
        ? { value: item.id, tabIndex: 0, onClick: handleClick, 'data-testid': testId, 'data-object-id': id }
        : { onClick: handleClick, 'data-testid': testId, 'data-object-id': id };

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
  }),
);

export const L0ItemActiveTabIndicator = ({ classNames }: ThemedClassName<{}>) => (
  <div
    role='none'
    className={mx(
      'hidden group-aria-selected/l0item:block absolute start-0 inset-y-2 w-1 bg-accent-surface rounded-ie',
      classNames,
    )}
  />
);

// TODO(burdon): Factor out pinned (non-draggable) items.
const L0Item = memo(({ item, parent, path, pinned, onRearrange }: L0ItemProps) => {
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
        {...(hue && { style: { background: `var(--color-${hue}-surface)` } })}
        className={mx(
          l0ItemContent,
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
  const type = l0ItemType(item);
  if (item.properties.icon) {
    const hue = item.properties.hue ?? null;
    const hueFgStyle = hue && { style: { color: `var(--color-${hue}-surface-text)` } };
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
// L0Menu
//

export type L0MenuProps = {
  menuActions: MenuItem[];
  topLevelItems: Node.Node[];
  pinnedItems: Node.Node[];
  userAccountItem?: Node.Node;
  parent?: Node.Node;
  path: string[];
};

export const L0Menu = ({ menuActions, topLevelItems, pinnedItems, userAccountItem, parent, path }: L0MenuProps) => {
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
        'grid grid-cols-[var(--dx-l0-size)] grid-rows-[var(--dx-rail-size)_1fr_min-content_var(--dx-l0-size)] contain-layout',
        '!w-(--dx-l0-size) bg-toolbar-surface border-e border-subdued-separator app-drag pb-[env(safe-area-inset-bottom)]',
      ]}
    >
      {/* TODO(wittjosiah): Use L0Item trigger. */}
      <MenuProvider onAction={handleAction}>
        <DropdownMenu.Root group={parent} items={menuActions}>
          <Tooltip.Trigger content={t('app menu label')} side='right' asChild>
            <Tabs.TabPrimitive value='options' asChild role='button'>
              <DropdownMenu.Trigger
                data-testid='spacePlugin.addSpace'
                className={mx(
                  l0ItemRoot,
                  'grid place-items-center dx-focus-ring-group',
                  '[body[data-platform="macos"]_&]:mt-[30px]',
                )}
              >
                <div
                  role='none'
                  className={mx(
                    l0ItemContent,
                    'h-(--dx-rail-action) w-(--dx-rail-action) group-hover/l0item:bg-hover-surface',
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
      <ScrollArea.Root thin orientation='vertical'>
        <ScrollArea.Viewport>
          <div
            role='none'
            className={mx([
              'flex flex-col gap-1 pt-1',
              '[body[data-platform="macos"]_&]:py-[30px]',
              '[body[data-platform="ios"]_&]:py-[max(env(safe-area-inset-top),0.25rem)]',
            ])}
          >
            {topLevelItems.map((item) => (
              <L0Item
                key={item.id}
                item={item}
                parent={parent}
                path={path}
                {...(hasRearrangeableItems && { onRearrange: handleRearrange })}
              />
            ))}
          </div>
        </ScrollArea.Viewport>
      </ScrollArea.Root>

      {/* Actions. */}
      <div role='none' className='grid grid-cols-1 auto-rows-(--dx-rail-action) pt-2'>
        {pinnedItems.map((item) => (
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
    </Tabs.Tablist>
  );
};
