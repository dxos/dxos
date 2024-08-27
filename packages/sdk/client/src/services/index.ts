//
// Copyright 2021 DXOS.org
//

export { getUnixSocket, fromAgent, type FromAgentOptions, AgentClientServiceProvider } from './agent';
export { createClientServices } from './client-services-factory';
// TODO(wittjosiah): Remove this once this is internal to shell manager.
export { IFrameManager } from './iframe-manager';
export { fromHost, LocalClientServices } from './local-client-services';
export { ClientServicesProxy } from './service-proxy';
export { Shell } from './shell';
export { ShellManager } from './shell-manager';
export { fromSocket } from './socket';
export { SharedWorkerConnection } from './shared-worker-connection';
export { fromWorker, WorkerClientServices } from './worker-client-services';
export { type AgentHostingProviderClient, AgentManagerClient } from './agent-hosting-provider';
export { FakeAgentHostingProvider } from './fake-agent-hosting-provider';
