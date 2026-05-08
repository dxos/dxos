//
// Copyright 2024 DXOS.org
//

/** Points at `AgentService.ts` so consumers get `createSession`/`getSession`/`layer` under `AgentService.*`, not the agent-service barrel. */
export * as AgentService from './agent-service/AgentService';
export { AGENT_PROCESS_KEY } from './agent-service/agent-process';
export * from './executor';
export * from './process';
export * from './services';
export * from './trace';
export * from './triggers';
export * from './url';
export * from './errors';
export * as FeedTraceSink from './FeedTraceSink';
