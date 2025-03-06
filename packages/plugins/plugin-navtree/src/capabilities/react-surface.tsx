//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { isGraphNode } from '@dxos/plugin-graph';

import {
  CommandsDialogContent,
  CommandsTrigger,
  NavTreeDocumentTitle,
  NotchStart,
  NavTreeContainer,
} from '../components';
import { COMMANDS_DIALOG, NAVTREE_PLUGIN } from '../meta';

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
      filter: (data): data is { popoverAnchorId?: string; topbar: boolean; current: string } =>
        typeof data.current === 'string',
      component: ({ data }) => (
        <NavTreeContainer
          tab={data.current}
          popoverAnchorId={data.popoverAnchorId as string | undefined}
          topbar={data.topbar as boolean}
        />
      ),
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
