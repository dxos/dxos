//
// Copyright 2026 DXOS.org
//

import { type ClaudeManagedAgent } from '#types';

import { type AgentConfig, type ContentBlock, type SessionEvent, type TranscriptMessage } from './types';

/**
 * Projects the stored agent object onto the Managed Agents request body. Optional fields are omitted
 * rather than sent empty: the API rejects an empty `tools`/`skills`/`mcp_servers` entry list.
 */
export const toAgentConfig = (agent: ClaudeManagedAgent.ClaudeManagedAgent): AgentConfig => ({
  name: agent.name,
  model: agent.effort ? { id: agent.model, effort: agent.effort } : agent.model,
  ...(agent.description ? { description: agent.description } : {}),
  ...(agent.systemPrompt ? { system: agent.systemPrompt } : {}),
  ...(agent.tools?.length ? { tools: agent.tools.map((type) => ({ type })) } : {}),
  ...(agent.skills?.length
    ? { skills: agent.skills.map((skillId) => ({ type: 'anthropic' as const, skill_id: skillId })) }
    : {}),
  ...(agent.mcpServers?.length
    ? {
        mcp_servers: agent.mcpServers.map(({ name, url }) => ({ type: 'url' as const, name, url })),
      }
    : {}),
});

const textOf = (content: readonly ContentBlock[] | undefined): string =>
  (content ?? [])
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('')
    .trim();

/**
 * Flattens a session's event list into readable turns, dropping the tool, span and status events
 * that carry no prose. Events with no text (a thinking signal, an empty message) are dropped too.
 */
export const toTranscript = (events: readonly SessionEvent[]): TranscriptMessage[] =>
  events.flatMap((event) => {
    const role = event.type === 'user.message' ? 'user' : event.type === 'agent.message' ? 'agent' : undefined;
    if (!role) {
      return [];
    }
    const text = textOf(event.content);
    return text.length > 0 ? [{ role, text }] : [];
  });
