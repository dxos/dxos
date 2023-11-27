//
// Copyright 2021 DXOS.org
//

export {
  DEFAULT_VAULT_ORIGIN,
  DEFAULT_VAULT_URL,
  type ClientServices,
  type ClientServicesProvider,
  type ShellRuntime,
} from '@dxos/client-protocol';
export { SystemStatus } from '@dxos/protocols/proto/dxos/client/services';
export {
  type AppContextRequest,
  type LayoutRequest,
  ShellDisplay,
  ShellLayout,
} from '@dxos/protocols/proto/dxos/iframe';

export { getUnixSocket, fromAgent, type FromAgentOptions, AgentClientServiceProvider } from './agent';
export { createClientServices, Remote } from './client-services-factory';
export { IFrameClientServicesHost, type IFrameClientServicesHostOptions } from './iframe-service-host';
export { IFrameClientServicesProxy, type IFrameClientServicesProxyOptions } from './iframe-service-proxy';
export { LocalClientServices } from './local-client-services';
export { ClientServicesProxy } from './service-proxy';
export { Shell } from './shell';
export { ShellManager } from './shell-manager';
export { fromSocket } from './socket';
export { fromHost, fromIFrame } from './utils';
