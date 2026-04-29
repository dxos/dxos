//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { BlueprintDefinition, OperationHandler } from '#capabilities';
import { meta } from '#meta';
import { ProfileOf } from '#types';

export default Plugin.define(meta).pipe(
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({ schema: [ProfileOf.ProfileOf] }),
  Plugin.make,
);
