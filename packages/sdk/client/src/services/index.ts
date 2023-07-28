//
// Copyright 2021 DXOS.org
//

export {
  type ClientServices,
  type ClientServicesProvider,
  DEFAULT_CLIENT_ORIGIN,
  type ShellRuntime,
} from '@dxos/client-protocol';
export { SystemStatus } from '@dxos/protocols/proto/dxos/client/services';
export {
  type AppContextRequest,
  type LayoutRequest,
  ShellDisplay,
  ShellLayout,
} from '@dxos/protocols/proto/dxos/iframe';

export { getUnixSocket, fromAgent, FromAgentOptions, AgentClientServiceProvider } from './agent';
export { IFrameClientServicesHost, IFrameClientServicesHostOptions } from './iframe-service-host';
export { IFrameClientServicesProxy, IFrameClientServicesProxyOptions } from './iframe-service-proxy';
export { LocalClientServices } from './local-client-services';
export { ClientServicesProxy } from './service-proxy';
export { fromSocket } from './socket';
export { fromHost, fromIFrame } from './utils';
