//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { CreateObject, OperationHandler, SkillDefinition } from '#capabilities';
import { meta } from '#meta';

// TODO(wittjosiah): Factor out shared modules.

export const InboxPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(SkillDefinition),
  Plugin.addModule(CreateObject),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(AppCapability.schema(() => import('./schema.node'))),
  Plugin.make,
);

export default InboxPlugin;
