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

export * from './agent';
export * from './iframe-controller';
export * from './iframe-service-host';
export * from './iframe-service-proxy';
export * from './local-client-services';
export * from './service-proxy';
export * from './shell-controller';
export * from './socket';
export * from './utils';
