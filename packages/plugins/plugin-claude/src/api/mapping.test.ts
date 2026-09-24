//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ClaudeManagedAgent } from '#types';

import { toAgentConfig, toTranscript } from './mapping.ts';
import { type SessionEvent } from './types.ts';

describe('toAgentConfig', () => {
  test('defaults the model and toolset, omitting empty collections', ({ expect }) => {
    const config = toAgentConfig(ClaudeManagedAgent.make({ name: 'Researcher' }));
    expect(config.name).toBe('Researcher');
    expect(config.model).toBe(ClaudeManagedAgent.DEFAULT_MODEL);
    expect(config.tools).toEqual([{ type: ClaudeManagedAgent.DEFAULT_TOOLSET }]);
    expect(config).not.toHaveProperty('skills');
    expect(config).not.toHaveProperty('mcp_servers');
    expect(config).not.toHaveProperty('system');
  });

  test('projects effort onto the model object', ({ expect }) => {
    const config = toAgentConfig(ClaudeManagedAgent.make({ name: 'Researcher', effort: 'high' }));
    expect(config.model).toEqual({ id: ClaudeManagedAgent.DEFAULT_MODEL, effort: 'high' });
  });

  test('projects the system prompt, skills and MCP servers', ({ expect }) => {
    const config = toAgentConfig(
      ClaudeManagedAgent.make({
        name: 'Analyst',
        model: 'claude-sonnet-5',
        systemPrompt: 'Be precise.',
        skills: ['xlsx'],
        mcpServers: [{ name: 'github', url: 'https://api.githubcopilot.com/mcp/' }],
      }),
    );
    expect(config.model).toBe('claude-sonnet-5');
    expect(config.system).toBe('Be precise.');
    expect(config.skills).toEqual([{ type: 'anthropic', skill_id: 'xlsx' }]);
    expect(config.mcp_servers).toEqual([{ type: 'url', name: 'github', url: 'https://api.githubcopilot.com/mcp/' }]);
  });
});

describe('toTranscript', () => {
  const events: SessionEvent[] = [
    { type: 'user.message', content: [{ type: 'text', text: 'Summarize the repo.' }] },
    { type: 'session.status_running' },
    { type: 'agent.tool_use', content: [{ type: 'text', text: 'ls -la' }] },
    { type: 'agent.message', content: [{ type: 'text', text: 'It is a monorepo.' }] },
    { type: 'agent.message', content: [{ type: 'thinking' }] },
    { type: 'session.status_idle' },
  ];

  test('keeps user and agent prose in order', ({ expect }) => {
    expect(toTranscript(events)).toEqual([
      { role: 'user', text: 'Summarize the repo.' },
      { role: 'agent', text: 'It is a monorepo.' },
    ]);
  });

  test('joins multiple text blocks and trims', ({ expect }) => {
    expect(
      toTranscript([
        {
          type: 'agent.message',
          content: [
            { type: 'text', text: ' one ' },
            { type: 'text', text: 'two ' },
          ],
        },
      ]),
    ).toEqual([{ role: 'agent', text: 'one two' }]);
  });

  test('returns nothing for an empty event list', ({ expect }) => {
    expect(toTranscript([])).toEqual([]);
  });
});
