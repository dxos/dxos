//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { createSurface, Capabilities, contributes, useCapability } from '@dxos/app-framework';
import { isGraphNode, type Node } from '@dxos/plugin-graph';

import { NavTreeCapabilities } from './capabilities';
import {
  CommandsDialogContent,
  CommandsTrigger,
  NavTreeDocumentTitle,
  NotchStart,
  NavTreeContainer,
} from '../components';
import { NavTreeFooter } from '../components/NavTreeFooter';
import { COMMANDS_DIALOG, NAVTREE_PLUGIN } from '../meta';
import { type NavTreeItemGraphNode } from '../types';
import { expandChildrenAndActions } from '../util';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: COMMANDS_DIALOG,
      role: 'dialog',
      filter: (data): data is { subject?: string } => data.component === COMMANDS_DIALOG,
      component: ({ data }) => <CommandsDialogContent selected={data.subject} />,
    }),
    createSurface({
      id: `${NAVTREE_PLUGIN}/navigation`,
      role: 'navigation',
      component: ({ data }) => {
        const { graph } = useCapability(Capabilities.AppGraph);
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

        return (
          <NavTreeContainer
            isOpen={isOpen}
            isCurrent={isCurrent}
            onOpenChange={handleOpenChange}
            popoverAnchorId={data.popoverAnchorId as string | undefined}
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
      id: `${NAVTREE_PLUGIN}/header-end`,
      role: 'header-end',
      component: () => <NavTreeFooter />,
    }),
    createSurface({
      id: `${NAVTREE_PLUGIN}/search-input`,
      role: 'search-input',
      disposition: 'fallback',
      component: () => <CommandsTrigger />,
    }),
  ]);
