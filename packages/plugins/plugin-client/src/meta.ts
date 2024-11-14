//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const CLIENT_PLUGIN = 'dxos.org/plugin/client';

export default {
  id: CLIENT_PLUGIN,
  name: 'Client',
} satisfies PluginMeta;

const CLIENT_ACTION = `${CLIENT_PLUGIN}/action`;
export enum ClientAction {
  CREATE_IDENTITY = `${CLIENT_ACTION}/CREATE_IDENTITY`,
  JOIN_IDENTITY = `${CLIENT_ACTION}/JOIN_IDENTITY`,
  SHARE_IDENTITY = `${CLIENT_ACTION}/SHARE_IDENTITY`,
  RECOVER_IDENTITY = `${CLIENT_ACTION}/RECOVER_IDENTITY`,
  RESET_STORAGE = `${CLIENT_ACTION}/RESET_STORAGE`,
}

// NOTE: This action is hardcoded to avoid circular dependency with observability plugin.
export const OBSERVABILITY_ACTION = 'dxos.org/plugin/observability/send-event';
