//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { AccessToken } from '@dxos/types';

import { OperationHandler } from '#capabilities';
import { meta } from '#meta';
import { Integration } from '#types';

export const IntegrationPlugin = Plugin.define(meta).pipe(
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({ schema: [AccessToken.AccessToken, Integration.Integration] }),
  Plugin.make,
);

export default IntegrationPlugin;
