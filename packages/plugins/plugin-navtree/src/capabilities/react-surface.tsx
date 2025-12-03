//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { isGraphNode } from '@dxos/plugin-graph';

import { CommandsDialogContent, CommandsTrigger, NavTreeContainer, NavTreeDocumentTitle } from '../components';
import { COMMANDS_DIALOG, meta } from '../meta';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: COMMANDS_DIALOG,
      role: 'dialog',
      filter: (data): data is { props: { selected?: string } } => data.component === COMMANDS_DIALOG,
      component: ({ data, ref }) => <CommandsDialogContent {...data.props} ref={ref} />,
    }),
    createSurface({
      id: `${meta.id}/navigation`,
      role: 'navigation',
      filter: (data): data is { popoverAnchorId?: string; topbar: boolean; current: string } =>
        typeof data.current === 'string',
      component: ({ data, ref }) => {
        return (
          <NavTreeContainer
            tab={data.current}
            popoverAnchorId={data.popoverAnchorId as string | undefined}
            topbar={data.topbar as boolean}
            ref={ref}
          />
        );
      },
    }),
    createSurface({
      id: `${meta.id}/document-title`,
      role: 'document-title',
      component: ({ data }) => <NavTreeDocumentTitle node={isGraphNode(data.subject) ? data.subject : undefined} />,
    }),
    createSurface({
      id: `${meta.id}/search-input`,
      role: 'search-input',
      position: 'fallback',
      component: () => <CommandsTrigger />,
    }),
  ]);
