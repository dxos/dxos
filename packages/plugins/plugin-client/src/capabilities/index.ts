//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { translations } from '#translations';

export { ClientAccountCache as AccountCache } from './account-cache.ts';
export { ClientAppGraphBuilder as AppGraphBuilder } from './app-graph-builder.ts';
// `#commands` resolves per condition: a node host has the OAuth callback server and filesystem the
// browser command set omits (`account`, `profile`).
export const Commands = AppCapability.lazyCommands(() => import('#commands'));
export { ClientHubHttpClient as HubHttpClient } from './hub-http-client.ts';
export { ClientModule as Client } from './client.ts';
export { LayerSpecs } from './layer-specs.ts';
export { Migrations } from './migrations.ts';
export { NavigationHandler } from './navigation-handler/index.ts';
export type { NavigationHandlerOptions } from './navigation-handler/index.ts';
export { NavigationTargetLoader } from './navigation-target-loader.ts';
export { OperationHandler } from './operation-handler.ts';
export { ReactContext } from './react-context.tsx';
export { ReactSurface } from './react-surface.ts';
export { SchemaDefs } from './schema-defs.ts';
export { ClientRemoteTraceMonitor as RemoteTraceMonitor } from './remote-trace-monitor.ts';
export { SpaceReplicationProgress } from './space-replication-progress.ts';
export { TraceProgress } from './trace-progress.ts';
export const Translations = AppCapability.translations(translations);
