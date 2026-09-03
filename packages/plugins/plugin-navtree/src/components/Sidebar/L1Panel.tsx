//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import React, { memo, useCallback, useMemo } from 'react';

import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import * as DeckSchema from '@dxos/plugin-deck/DeckSchema';
import { useActionRunner, useEdges } from '@dxos/plugin-graph/hooks';
import { DensityProvider, IconButton, ScrollArea, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Empty, Tree } from '@dxos/react-ui-list';
import { Menu, type MenuItem } from '@dxos/react-ui-menu';
import { Tabs } from '@dxos/react-ui-tabs';
import { hoverableControlItem, hoverableOpenControlItem } from '@dxos/ui-theme';

import { getListActions, useActions, useLoadDescendents } from '#hooks';
import { meta } from '#meta';

import { NAV_TREE_ITEM } from '../NavTree/index.ts';
import { useNavTreeContext } from '../NavTreeContext/index.ts';
import { NavTreeItemColumns } from '../NavTreeItem/NavTreeItemColumns.tsx';

/**
 * Delay before the unavailable-workspace message appears, timed from the last change to the set of
 * space workspaces rather than from mount, so it lands only once that set has held still.
 */
const RENDER_DELAY = '1s';

/**
 * Width held for the item-end slot, whose surface resolves after the tree has painted: a
 * `min-content` track would start collapsed and re-truncate every label when it lands. Sized to
 * what fills it, an `AttentionGlyph` (`w-3`) inset by `mx-1`.
 */
const ITEM_END_SIZE = '1.25rem';

export type L1PanelProps = {
  open?: boolean;
  path: string[];
  /** The tab's workspace id, which may name a workspace that has no graph node. */
  id: string;
  /** Absent when the workspace is not in the graph; the panel then renders the unavailable message. */
  item?: AppGraphNode.Node;
  /**
   * Identity of the set of space workspaces, which the unavailable message is a claim about. Empty
   * means not-loaded-yet rather than nothing-to-show, since every identity ends up with at least a
   * settings space.
   */
  spaces?: string;
  isCurrent: boolean;
  onBack?: () => void;
};

/**
 * Space or settings panel. Without an `item` — a link to a workspace this identity never had or which no
 * longer exists, or persisted deck state pointing at one after a profile switch — the panel body is the
 * unavailable-workspace message, so the sidebar is never blank.
 */
const L1PanelInner = ({ open, path, id, item, spaces, isCurrent, onBack }: L1PanelProps) => {
  const { t } = useTranslation(meta.profile.key);
  const title = item ? toLocalizedString(item.properties.label, t) : t('workspace-unavailable.heading');
  const isActivated = useIsActivatedWorkspace(id);
  const shouldRenderContent = isCurrent || isActivated;
  // Needs a published space list to make the claim against, and a workspace actually being asked
  // for — the sentinel deck means none has resolved yet.
  const reportUnavailable = !!spaces && id !== DeckSchema.DEFAULT_DECK_ID;

  return (
    <Tabs.Panel
      key={id}
      value={id}
      classNames={[
        'absolute inset-y-0 end-0',
        'w-[calc(100%-var(--dx-l0-size))] lg:w-(--dx-l1-size) grid-cols-1 grid-rows-[var(--dx-rail-size)_1fr]',
        'py-[env(safe-area-inset-top)]',
        isCurrent && 'grid',
      ]}
      tabIndex={-1}
      aria-label={title}
      // An unavailable workspace has no tab in the rail, so the generated `aria-labelledby` would
      // reference a missing element.
      {...(!item && { 'aria-labelledby': undefined })}
      {...(isCurrent && {
        'data-testid': item ? 'navtree.workspace.visible' : 'navtree.workspace.unavailable',
      })}
      {...(!open && { inert: true })}
    >
      {shouldRenderContent &&
        (item ? (
          <L1PanelContent open={open} path={path} item={item} onBack={onBack} />
        ) : (
          reportUnavailable && (
            <Empty
              // Spaces publish one at a time, so remounting restarts the delay until they stop.
              key={spaces}
              label={t('workspace-unavailable.description')}
              // Second grid row, so the message clears the rail exactly as the tree does, and
              // hugging its top rather than stretching to the row's full height.
              classNames='row-start-2 self-start animate-fade-in'
              style={{ animationDelay: RENDER_DELAY, animationFillMode: 'backwards' }}
            />
          )
        ))}
    </Tabs.Panel>
  );
};

/** Determines whether a workspace tab has been populated with real child content (i.e. expanded at least once). */
const useIsActivatedWorkspace = (id: string): boolean => {
  const { graph } = useAppGraph();
  const edges = useEdges(graph, id);

  return useMemo(() => {
    const childIds = edges[AppGraph.relationKey('child')] ?? [];
    return childIds.some((childId) => {
      const child = AppGraph.getNode(graph, childId);
      if (Option.isNone(child)) {
        return false;
      }
      return child.value.properties.disposition === undefined;
    });
  }, [edges, graph]);
};

/**
 * Mounted panel content for active or previously-visited tabs.
 */
const L1PanelContent = ({
  path,
  item,
  onBack,
}: Pick<L1PanelProps, 'open' | 'path' | 'onBack'> & { item: AppGraphNode.Node }) => {
  const navTreeContext = useNavTreeContext();

  return (
    <DensityProvider density='md'>
      <L1PanelHeader path={path} item={item} onBack={onBack} />
      <ScrollArea.Root centered padding thin orientation='vertical'>
        <ScrollArea.Viewport>
          <Tree
            classNames='pt-[2px]'
            model={navTreeContext.model}
            id={item.id}
            rootId={item.id}
            path={path}
            draggable
            gridTemplateColumns={`[tree-row-start] var(--dx-control) minmax(0, 1fr) min-content minmax(${ITEM_END_SIZE}, min-content) [tree-row-end]`}
            renderColumns={NavTreeItemColumns}
            blockInstruction={navTreeContext.blockInstruction}
            canDrop={navTreeContext.canDrop}
            canSelect={navTreeContext.canSelect}
            onOpenChange={navTreeContext.onOpenChange}
            onSelect={navTreeContext.onSelect}
            onItemHover={navTreeContext.onItemHover}
          />
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </DensityProvider>
  );
};

/**
 * Header row.
 */
const L1PanelHeader = ({ item, path, onBack }: Pick<L1PanelProps, 'path' | 'onBack'> & { item: AppGraphNode.Node }) => {
  const { t } = useTranslation(meta.profile.key);
  const { renderItemEnd: ItemEnd } = useNavTreeContext();
  const title = toLocalizedString(item.properties.label, t);
  const backCapableWorkspace = GraphPath.isPinnedWorkspace(item.id);

  const { menuActions, onAction } = useL1MenuActions({ item, path });
  useLoadDescendents(item);

  return (
    <div
      data-tauri-drag-region
      className='grid w-full items-center dx-app-drag dx-density-lg'
      // Same late item-end surface as the tree rows below, so the header holds the slot too.
      style={{ gridTemplateColumns: `28px 1fr min-content minmax(${ITEM_END_SIZE}, min-content)` }}
    >
      {backCapableWorkspace ? (
        <IconButton
          classNames={[hoverableControlItem, hoverableOpenControlItem]}
          variant='ghost'
          icon='ph--caret-left--regular'
          iconOnly
          size={4}
          label={t('button-back.button')}
          data-testid='treeView.primaryTreeButton'
          onClick={() => onBack?.()}
        />
      ) : (
        <div />
      )}
      <h2 data-tauri-drag-region className='flex-1 truncate min-w-0'>
        {title}
      </h2>
      <div className='contents dx-app-no-drag'>
        <MenuActions item={item} menuActions={menuActions} onAction={onAction} />
        {ItemEnd && <ItemEnd node={item} open />}
      </div>
    </div>
  );
};

type L1MenuActions = {
  menuActions: AppGraphNode.Action[];
  onAction: (action: AppGraphNode.Action, params?: AppGraphNode.InvokeProps) => void;
};

/**
 * Header menu actions for an L1 workspace tab. Renders nothing for an empty
 * `menuActions`, a single inline icon button for one action, and a
 * `…`-menu trigger for multiple.
 */
const MenuActions = ({
  item,
  menuActions,
  onAction,
}: {
  item: AppGraphNode.Node;
} & Pick<L1MenuActions, 'menuActions' | 'onAction'>) => {
  const { t } = useTranslation(meta.profile.key);

  if (menuActions.length === 0) {
    return null;
  }

  if (menuActions.length === 1) {
    return (
      <IconButton
        classNames={['shrink-0 px-2 pointer-fine:px-1', hoverableControlItem, hoverableOpenControlItem]}
        variant='ghost'
        icon={menuActions[0].properties?.icon ?? 'ph--circle-dashed--regular'}
        iconOnly
        size={4}
        label={toLocalizedString(menuActions[0].properties?.label, t)}
        data-testid={menuActions[0].properties?.testId}
        onClick={() => onAction(menuActions[0] as AppGraphNode.Action)}
      />
    );
  }

  return (
    <Menu.Root caller={NAV_TREE_ITEM} onAction={onAction}>
      <Menu.Trigger asChild>
        <IconButton
          classNames={['shrink-0 px-2 pointer-fine:px-1', hoverableControlItem, hoverableOpenControlItem]}
          variant='ghost'
          icon='ph--dots-three-vertical--regular'
          iconOnly
          size={4}
          label={t('tree-item-actions.label')}
          data-testid='navtree.treeItem.actionsLevel0'
        />
      </Menu.Trigger>
      <Menu.Content group={item} items={menuActions as MenuItem[]} />
    </Menu.Root>
  );
};

/**
 * Builds the menu actions for the L1 panel header.
 */
const useL1MenuActions = ({ item, path }: Pick<L1PanelProps, 'path'> & { item: AppGraphNode.Node }): L1MenuActions => {
  const runAction = useActionRunner();

  const menuActions = getListActions(useActions(item));

  const onAction = useCallback(
    (action: AppGraphNode.Action, params?: AppGraphNode.InvokeProps) => {
      void runAction(action, { ...params, path });
    },
    [runAction, path],
  );

  return { menuActions, onAction };
};

export const L1Panel = memo(L1PanelInner);
