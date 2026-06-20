//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { type ComponentProps } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Node } from '@dxos/plugin-graph';
import { Position } from '@dxos/util';

import { CommandsDialogContent, CommandsTrigger, NavTreeContainer, NavTreeDocumentTitle } from '#containers';
import { COMMANDS_DIALOG } from '#meta';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: COMMANDS_DIALOG,
        filter: AppSurface.component<ComponentProps<typeof CommandsDialogContent>>(AppSurface.Dialog, COMMANDS_DIALOG),
        component: ({ data, ref }) => <CommandsDialogContent {...data.props} ref={ref} />,
      }),
      Surface.create({
        id: 'navigation',
        filter: Surface.makeFilter(AppSurface.Navigation),
        component: ({ data, ref }) => (
          <NavTreeContainer tab={data.current} popoverAnchorId={data.popoverAnchorId} ref={ref} />
        ),
      }),
      Surface.create({
        id: 'documentTitle',
        filter: Surface.makeFilter(AppSurface.DocumentTitle),
        component: ({ data }) => (
          <NavTreeDocumentTitle node={Node.isGraphNode(data.subject) ? data.subject : undefined} />
        ),
      }),
      Surface.create({
        id: 'searchInput',
        filter: Surface.makeFilter(AppSurface.SearchInput),
        position: Position.last,
        component: () => <CommandsTrigger />,
      }),
    ]),
  ),
);
