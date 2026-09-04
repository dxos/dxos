//
// Copyright 2026 DXOS.org
//

export * as AgentService from './AgentService';
// `AgentProcess` itself, not just its key: a remote host (EDGE) puts the definition in its own
// process registry, so it has to be able to name it.
export { AGENT_PROCESS_KEY, AgentProcess, type AgentProcessOptions } from './agent-process';
export { type Delegation, type DelegationStrategy } from './delegation-strategy';
export * from './turn-producer';
