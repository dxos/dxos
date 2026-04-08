//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { WorkspaceSettingsContainer } from '#containers';
import { useActiveFilesystemWorkspace } from '#hooks';
import { meta } from '#meta';

const GENERAL_TYPE = `${meta.id}.general`;

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: `${meta.id}.workspace-settings`,
        role: 'article',
        filter: AppSurface.literal(GENERAL_TYPE),
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
