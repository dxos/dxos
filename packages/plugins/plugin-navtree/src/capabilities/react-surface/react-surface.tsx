//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { Node } from '@dxos/plugin-graph';

import { CommandsDialogContent, CommandsTrigger, NavTreeContainer, NavTreeDocumentTitle } from '../../components';
import { COMMANDS_DIALOG, meta } from '../../meta';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: COMMANDS_DIALOG,
        role: 'dialog',
        filter: (data): data is { props: { selected?: string } } => data.component === COMMANDS_DIALOG,
        component: ({ data, ref }) => <CommandsDialogContent {...data.props} ref={ref} />,
      }),
      Surface.create({
        id: `${meta.id}/navigation`,
        role: 'navigation',
        filter: (data): data is { popoverAnchorId?: string; current: string } => typeof data.current === 'string',
        component: ({ data, ref }) => {
          return (
            <NavTreeContainer
              tab={data.current}
              popoverAnchorId={data.popoverAnchorId as string | undefined}
              ref={ref}
            />
          );
        },
      }),
      Surface.create({
        id: `${meta.id}/document-title`,
        role: 'document-title',
        component: ({ data }) => (
          <NavTreeDocumentTitle node={Node.isGraphNode(data.subject) ? data.subject : undefined} />
        ),
      }),
      Surface.create({
        id: `${meta.id}/search-input`,
        role: 'search-input',
        position: 'fallback',
        component: () => <CommandsTrigger />,
      }),
    ]),
  ),
);
