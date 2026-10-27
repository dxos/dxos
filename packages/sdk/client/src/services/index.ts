//
// Copyright 2021 DXOS.org
//

export { type CreateClientServicesOptions, createClientServices } from './client-services-factory.tsx';
// TODO(wittjosiah): Remove this once this is internal to shell manager.
export { IFrameManager } from './iframe-manager.ts';
// `LocalClientServices` / `fromHost` are NOT re-exported here — see `./local.ts`. Only the type
// crosses, which erases.
export { type LocalClientServicesParams } from './local-client-services.ts';
export { ClientServicesProxy } from './service-proxy.ts';
export { Shell } from './shell.ts';
export { ShellManager } from './shell-manager.ts';
export { type AgentHostingProviderClient, AgentManagerClient } from './agent-hosting-provider.ts';
export { FakeAgentHostingProvider } from './fake-agent-hosting-provider.ts';
export * from './dedicated/index.ts';
