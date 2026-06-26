//
// Copyright 2024 DXOS.org
//

// Re-exports the agent-service barrel: `AgentService` namespace (API from @dxos/compute +
// createSession/layer), `AGENT_PROCESS_KEY`, and the delegation types.
export * from './agent-service';
export * from './executor';
export { ProcessManager } from './process';
export * from './services';
export * from './trace';
export * from './triggers';
export * from './url';
export * from './errors';
export * as FeedTraceSink from './FeedTraceSink';
