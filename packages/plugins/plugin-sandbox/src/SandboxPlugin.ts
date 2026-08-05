//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { AccessToken } from '@dxos/link';

import { OperationHandler, SkillDefinition } from '#capabilities';
import { meta } from '#meta';
import { Sandbox } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const SandboxPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(AppCapability.schema([Sandbox.Sandbox, AccessToken.AccessToken])),
  Plugin.addModule(
    AppCapability.pluginAsset({
      pluginId: meta.profile.key,
      path: 'PLUGIN.mdl',
      content: pluginSpec,
      mimeType: 'application/x-mdl',
    }),
  ),
  Plugin.make,
);

export default SandboxPlugin;
