//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Common } from '@dxos/app-framework';
import { useAppGraph, useOperationInvoker } from '@dxos/app-framework/react';
import { Graph, Node } from '@dxos/plugin-graph';
import { IconButton, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { mx, osTranslations, surfaceZIndex } from '@dxos/ui-theme';

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

export type BannerProps = {
  node?: Node.Node;
};

export const Banner = ({ node }: BannerProps) => {
  const { t } = useTranslation(meta.id);
  const { state } = useSimpleLayoutState();
  const { invokePromise } = useOperationInvoker();
  const { graph } = useAppGraph();
  const label = node ? toLocalizedString(node.properties.label, t) : t('current app name', { ns: osTranslations });

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

  return (
    // Note that the HTML5 element `header` has a default role of `banner`, hence the name of this component.
    // It should not be confused with the `heading` role (elements h1-6).
    // TODO(burdon): Fixed or not?
    <header
      className={mx(
        '_fixed flex items-center gap-2 pli-2 block-start-0 inset-inline-0 bs-[--dx-mobile-topbar-content-height,48px] bg-baseSurface border-be border-separator',
        'grid grid-cols-[min-content_1fr_min-content]',
        surfaceZIndex({ level: 'menu' }),
      )}
    >
      {node ? (
        <IconButton
          iconOnly
          variant='ghost'
          icon='ph--caret-left--regular'
          label={t('back label')}
          onClick={handleClick}
        />
      ) : (
        <div />
      )}
      <h1 className={'grow text-center truncate font-medium'}>
        {label || t('current app name', { ns: osTranslations })}
      </h1>
      {/* TODO(burdon): Menu. */}
    </header>
  );
};
