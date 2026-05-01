//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

const Handlers = OperationHandlerSet.lazy(
  () => import('./create-bot'),
  () => import('./set-token'),
  () => import('./disconnect-guild'),
);

export { CreateBot, SetToken, DisconnectGuild } from './definitions';

export const DiscordHandlers = Handlers;
