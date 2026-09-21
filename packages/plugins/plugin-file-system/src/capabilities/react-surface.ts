//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { WorkspaceSettingsContainer } from '#containers';
import { meta } from '#meta';
import { FileSystemCapabilities } from '#types';

const GENERAL_TYPE = `${meta.profile.key}.general`;

export const ReactSurface = AppCapability.surface(
  Effect.fnUntraced(function* () {
    return Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'workspaceSettings',
        filter: AppSurface.literal(AppSurface.Article, GENERAL_TYPE),
        component: WorkspaceSettingsContainer,
      }),
    ]);
  }),
  {
    requires: [FileSystemCapabilities.State],
    roles: ['org.dxos.role.article'],
  },
);
