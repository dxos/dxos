//
// Copyright 2021 DXOS.org
//

export { AgentClientServiceProvider, type FromAgentOptions, fromAgent, getUnixSocket } from './agent';
export { type CreateClientServicesOptions, createClientServices } from './client-services-factory';
// TODO(wittjosiah): Remove this once this is internal to shell manager.
export { IFrameManager } from './iframe-manager';
export { LocalClientServices, type LocalClientServicesParams, fromHost } from './local-client-services';
export { ClientServicesProxy } from './service-proxy';
export { Shell } from './shell';
export { ShellManager } from './shell-manager';
export { fromSocket } from './socket';
export { type AgentHostingProviderClient, AgentManagerClient } from './agent-hosting-provider';
export { FakeAgentHostingProvider } from './fake-agent-hosting-provider';
export * from './dedicated';
