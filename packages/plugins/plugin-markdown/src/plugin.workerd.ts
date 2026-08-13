//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { Schema } from '#capabilities';
import { meta } from '#meta';

export const MarkdownPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppCapability.skillDefinition(() => import('./capabilities/skill-definition'))),
  Plugin.addModule(AppCapability.operationHandler(() => import('./capabilities/operation-handler'))),
  Plugin.addModule(Schema),
  Plugin.make,
);

export default MarkdownPlugin;
