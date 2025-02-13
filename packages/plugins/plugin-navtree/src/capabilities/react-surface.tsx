//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import {
  Capabilities,
  contributes,
  createIntent,
  createSurface,
  LayoutAction,
  useAppGraph,
  useCapability,
  useIntentDispatcher,
} from '@dxos/app-framework';
import { isGraphNode, type Node } from '@dxos/plugin-graph';

import { NavTreeCapabilities } from './capabilities';
import {
  CommandsDialogContent,
  CommandsTrigger,
  NavTreeDocumentTitle,
  NotchStart,
  NavTreeContainer,
} from '../components';
import { COMMANDS_DIALOG, NAVTREE_PLUGIN } from '../meta';
import { type NavTreeItemGraphNode } from '../types';
import { expandChildrenAndActions } from '../util';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: COMMANDS_DIALOG,
      role: 'dialog',
      filter: (data): data is { props: { selected?: string } } => data.component === COMMANDS_DIALOG,
      component: ({ data }) => <CommandsDialogContent {...data.props} />,
    }),
    createSurface({
      id: `${NAVTREE_PLUGIN}/navigation`,
      role: 'navigation',
      filter: (data): data is { popoverAnchorId?: string; topbar: boolean; hoistStatusbar: boolean; current: string } =>
        typeof data.current === 'string',
      component: ({ data }) => {
        const { graph } = useAppGraph();
        const { dispatchPromise: dispatch } = useIntentDispatcher();
        const { isOpen, isCurrent, setItem } = useCapability(NavTreeCapabilities.State);

        const handleOpenChange = useCallback(
          ({ item: { id }, path, open }: { item: Node; path: string[]; open: boolean }) => {
            // TODO(thure): This might become a localstorage leak; openItemIds that no longer exist should be removed from this map.
            setItem(path, 'open', open);

            if (graph) {
              const node = graph.findNode(id);
              return node && expandChildrenAndActions(graph, node as NavTreeItemGraphNode);
            }
          },
          [graph],
        );

        const handleTabChange = useCallback(
          (tab: string) => dispatch(createIntent(LayoutAction.SwitchWorkspace, { part: 'workspace', subject: tab })),
          [dispatch],
        );

        return (
          <NavTreeContainer
            isOpen={isOpen}
            isCurrent={isCurrent}
            onOpenChange={handleOpenChange}
            popoverAnchorId={data.popoverAnchorId as string | undefined}
            topbar={data.topbar as boolean}
            hoistStatusbar={data.hoistStatusbar as boolean}
            tab={data.current}
            onTabChange={handleTabChange}
          />
        );
      },
    }),
    createSurface({
      id: `${NAVTREE_PLUGIN}/document-title`,
      role: 'document-title',
      component: ({ data }) => <NavTreeDocumentTitle node={isGraphNode(data.subject) ? data.subject : undefined} />,
    }),
    createSurface({
      id: `${NAVTREE_PLUGIN}/notch-start`,
      role: 'notch-start',
      component: () => <NotchStart />,
    }),
    createSurface({
      id: `${NAVTREE_PLUGIN}/search-input`,
      role: 'search-input',
      position: 'fallback',
      component: () => <CommandsTrigger />,
    }),
  ]);
