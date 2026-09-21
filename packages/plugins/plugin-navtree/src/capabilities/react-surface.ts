//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import { type ComponentProps } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Position } from '@dxos/util';

import { CommandsDialogContent, CommandsTrigger, NavTreeContainer, NavTreeDocumentTitle } from '#containers';
import { COMMANDS_DIALOG } from '#meta';

export const ReactSurface = AppCapability.surface(
  () =>
    Effect.succeed(
      Capability.contribute(Capabilities.ReactSurface, [
        Surface.create({
          id: COMMANDS_DIALOG,
          filter: AppSurface.component<ComponentProps<typeof CommandsDialogContent>>(
            AppSurface.Dialog,
            COMMANDS_DIALOG,
          ),
          component: CommandsDialogContent,
          props: ({ data: { props }, ref }) => ({ ...props, ref }),
        }),
        Surface.create({
          id: 'navigation',
          filter: Surface.makeFilter(AppSurface.Navigation),
          component: NavTreeContainer,
          props: ({ data: { current, popoverAnchorId }, ref }) => ({ tab: current, popoverAnchorId, ref }),
        }),
        Surface.create({
          id: 'documentTitle',
          filter: Surface.makeFilter(AppSurface.DocumentTitle),
          component: NavTreeDocumentTitle,
          props: ({ data: { subject } }) => ({ node: AppGraphNode.isGraphNode(subject) ? subject : undefined }),
        }),
        Surface.create({
          id: 'searchInput',
          filter: Surface.makeFilter(AppSurface.SearchInput),
          position: Position.last,
          component: CommandsTrigger,
        }),
      ]),
    ),
  {
    roles: [
      'org.dxos.role.dialog',
      'org.dxos.role.documentTitle',
      'org.dxos.role.navigation',
      'org.dxos.role.searchInput',
    ],
  },
);
