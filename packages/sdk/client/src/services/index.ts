//
// Copyright 2021 DXOS.org
//

export { type CreateClientServicesOptions, createClientServices } from './client-services-factory';
// TODO(wittjosiah): Remove this once this is internal to shell manager.
export { IFrameManager } from './iframe-manager';
// `LocalClientServices` / `fromHost` are NOT re-exported here — see `./local.ts`. Only the type
// crosses, which erases.
export { type LocalClientServicesParams } from './local-client-services';
export { ClientServicesProxy } from './service-proxy';
export { Shell } from './shell';
export { ShellManager } from './shell-manager';
export { type AgentHostingProviderClient, AgentManagerClient } from './agent-hosting-provider';
export { FakeAgentHostingProvider } from './fake-agent-hosting-provider';
export * from './dedicated';
