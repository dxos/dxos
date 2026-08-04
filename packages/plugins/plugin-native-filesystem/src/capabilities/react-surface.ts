//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { meta } from '#meta';

import { WorkspaceSettingsSurface } from './WorkspaceSettingsSurface';

const GENERAL_TYPE = `${meta.profile.key}.general`;

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'workspaceSettings',
        filter: AppSurface.literal(AppSurface.Article, GENERAL_TYPE),
        component: WorkspaceSettingsSurface,
      }),
    ]);
  }),
);
