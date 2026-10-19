//
// Copyright 2026 DXOS.org
//

import { type AgentDemoInput, AgentDemoProcess, type TranscriptEntry } from '../testing/index.ts';
import { type ProcessContextValue, makeProcessContext } from './process-context.tsx';

export type AgentContextValue = ProcessContextValue<AgentDemoInput, AgentDemoInput, TranscriptEntry>;

const { Provider, useProcesses } = makeProcessContext<AgentDemoInput, AgentDemoInput, TranscriptEntry>({
  name: 'Agent',
  definition: AgentDemoProcess,
});

/** Shares the agent processes between the story's modules. */
export const AgentProvider = Provider;

export const useAgents = useProcesses;
