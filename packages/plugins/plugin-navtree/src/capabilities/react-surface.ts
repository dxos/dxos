//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import { type ComponentProps } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Position from '@dxos/util/Position';

import { CommandsDialogContent, CommandsTrigger, NavTreeContainer, NavTreeDocumentTitle } from '#containers';
import { COMMANDS_DIALOG } from '#meta';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.Root.create({
        id: COMMANDS_DIALOG,
        filter: AppSurface.component<ComponentProps<typeof CommandsDialogContent>>(AppSurface.Dialog, COMMANDS_DIALOG),
        component: CommandsDialogContent,
        props: ({ data: { props }, ref }) => ({ ...props, ref }),
      }),
      Surface.Root.create({
        id: 'navigation',
        filter: Surface.Root.makeFilter(AppSurface.Navigation),
        component: NavTreeContainer,
        props: ({ data: { current, popoverAnchorId }, ref }) => ({ tab: current, popoverAnchorId, ref }),
      }),
      Surface.Root.create({
        id: 'documentTitle',
        filter: Surface.Root.makeFilter(AppSurface.DocumentTitle),
        component: NavTreeDocumentTitle,
        props: ({ data: { subject } }) => ({ node: AppGraphNode.isGraphNode(subject) ? subject : undefined }),
      }),
      Surface.Root.create({
        id: 'searchInput',
        filter: Surface.Root.makeFilter(AppSurface.SearchInput),
        position: Position.last,
        component: CommandsTrigger,
      }),
    ]),
  ),
);
