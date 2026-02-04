//
// Copyright 2025 DXOS.org
//

import React, { Fragment, useCallback, useMemo } from 'react';

import { Common } from '@dxos/app-framework';
import { useAppGraph, useOperationInvoker } from '@dxos/app-framework/react';
import { Graph, Node, useActionRunner, useActions } from '@dxos/plugin-graph';
import { IconButton, Popover, type ThemedClassName, Toolbar, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { DropdownMenu, MenuProvider } from '@dxos/react-ui-menu';
import { mx, osTranslations } from '@dxos/ui-theme';

import { useSimpleLayoutState } from '../../hooks';
import { meta } from '../../meta';

/**
 * Check if an item is a direct child of a workspace or collection.
 * Returns true if any parent node has disposition 'workspace' or 'collection'.
 */
const isWorkspaceOrCollectionChild = (graph: Graph.ReadableGraph, itemId: string): boolean => {
  const parents = Graph.getConnections(graph, itemId, 'inbound');
  return parents.some(
    (node) => node.properties.disposition === 'workspace' || node.properties.disposition === 'collection',
  );
};

export type BannerProps = ThemedClassName<{
  node?: Node.Node;
}>;

export const Banner = ({ node, classNames }: BannerProps) => {
  const { t } = useTranslation(meta.id);
  const { state } = useSimpleLayoutState();
  const { invokePromise } = useOperationInvoker();
  const { graph } = useAppGraph();
  const runAction = useActionRunner();

  const label = (node && toLocalizedString(node.properties.label, t)) ?? t('current app name', { ns: osTranslations });

  // Get actions for the current node, filtered by disposition.
  // NOTE: Graph expansion is handled by useLoadDescendents in Main.tsx.
  const allActions = useActions(graph, node?.id);
  const actions = useMemo(() => {
    return allActions.filter((a) =>
      ['list-item', 'list-item-primary', 'heading-list-item'].includes(a.properties.disposition),
    );
  }, [allActions]);

  // Check if current active item is a top-level workspace/collection child.
  const isTopLevelItem = useMemo(() => {
    if (!state.active) {
      return false;
    }
    return isWorkspaceOrCollectionChild(graph, state.active);
  }, [graph, state.active]);

  const handleClick = useCallback(async () => {
    if (state.active) {
      // If history is empty and this is a top-level item, go to home.
      if (state.history.length === 0 && isTopLevelItem) {
        await invokePromise(Common.LayoutOperation.SwitchWorkspace, { subject: Node.RootId });
      } else {
        // Otherwise, close (which will pop from history or clear active).
        await invokePromise(Common.LayoutOperation.Close, { subject: [state.active] });
      }
    } else {
      await invokePromise(Common.LayoutOperation.SwitchWorkspace, { subject: Node.RootId });
    }
  }, [invokePromise, state.active, state.history.length, isTopLevelItem]);

  // Wrap the menu trigger with Popover.Anchor when the popoverAnchorId matches.
  const AnchorRoot = node && state.popoverAnchorId === `dxos.org/ui/${meta.id}/${node.id}` ? Popover.Anchor : Fragment;

  if (!node) {
    return null;
  }

  return (
    <Toolbar.Root
      role='banner'
      density='coarse'
      classNames={mx('grid grid-cols-[var(--rail-size)_1fr_var(--rail-size)]', classNames)}
    >
      {node.id !== Node.RootId ? (
        <IconButton
          variant='ghost'
          icon='ph--caret-left--regular'
          iconOnly
          label={t('back label')}
          onClick={handleClick}
        />
      ) : (
        <div />
      )}
      <h1 className={'grow text-center truncate font-medium'}>{label}</h1>
      {actions.length > 0 ? (
        <AnchorRoot>
          <MenuProvider onAction={runAction}>
            <DropdownMenu.Root items={actions} caller={meta.id}>
              <DropdownMenu.Trigger asChild>
                <IconButton
                  variant='ghost'
                  icon='ph--dots-three-vertical--regular'
                  iconOnly
                  label={t('actions menu label')}
                />
              </DropdownMenu.Trigger>
            </DropdownMenu.Root>
          </MenuProvider>
        </AnchorRoot>
      ) : (
        <span />
      )}
    </Toolbar.Root>
  );
};
