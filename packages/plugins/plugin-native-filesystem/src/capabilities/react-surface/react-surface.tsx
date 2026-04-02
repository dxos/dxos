//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';

import { WorkspaceSettingsContainer } from '../../containers';
import { useActiveFilesystemWorkspace } from '../../hooks';
import { meta } from '../../meta';

const GENERAL_TYPE = `${meta.id}.general`;

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: `${meta.id}.workspace-settings`,
        role: 'article',
        filter: (data): data is { subject: string } => data.subject === GENERAL_TYPE,
        component: () => {
          const workspace = useActiveFilesystemWorkspace();
          if (!workspace) {
            return null;
          }

          return <WorkspaceSettingsContainer workspace={workspace} />;
        },
      }),
    ]);
  }),
);
