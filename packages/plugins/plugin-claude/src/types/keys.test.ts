//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Obj, Ref } from '@dxos/echo';

import { ANTHROPIC_SOURCE } from '../constants';
import * as ClaudeAgentSession from './ClaudeAgentSession';
import * as ClaudeManagedAgent from './ClaudeManagedAgent';

describe('Anthropic ids as foreign keys', () => {
  test('a new agent carries no Anthropic key until it is deployed', ({ expect }) => {
    const agent = ClaudeManagedAgent.make({ name: 'Researcher' });
    expect(Obj.getMeta(agent).keys).toEqual([]);
    expect(ClaudeManagedAgent.getAgentId(agent)).toBeUndefined();
  });

  test('deploying stamps the id as a foreign key', ({ expect }) => {
    const agent = ClaudeManagedAgent.make({ name: 'Researcher' });
    Obj.update(agent, (agent) => ClaudeManagedAgent.setAgentId(agent, 'agent_1'));
    expect(Obj.getMeta(agent).keys).toEqual([{ source: ANTHROPIC_SOURCE, id: 'agent_1' }]);
    expect(ClaudeManagedAgent.getAgentId(agent)).toBe('agent_1');
  });

  test('re-deploying replaces the key rather than appending', ({ expect }) => {
    // An agent has exactly one identity in Anthropic; appending would leave the object matching
    // a stale id under Filter.foreignKeys.
    const agent = ClaudeManagedAgent.make({ name: 'Researcher' });
    Obj.update(agent, (agent) => ClaudeManagedAgent.setAgentId(agent, 'agent_1'));
    Obj.update(agent, (agent) => ClaudeManagedAgent.setAgentId(agent, 'agent_2'));
    expect(Obj.getMeta(agent).keys).toEqual([{ source: ANTHROPIC_SOURCE, id: 'agent_2' }]);
    expect(ClaudeManagedAgent.getAgentId(agent)).toBe('agent_2');
  });

  test('a session is keyed by its Anthropic session id at creation', ({ expect }) => {
    const agent = ClaudeManagedAgent.make({ name: 'Researcher' });
    const session = ClaudeAgentSession.make({
      title: 'Researcher session',
      agent: Ref.make(agent),
      sessionId: 'sess_1',
      environmentId: 'env_1',
    });
    expect(Obj.getMeta(session).keys).toEqual([{ source: ANTHROPIC_SOURCE, id: 'sess_1' }]);
    expect(ClaudeAgentSession.getSessionId(session)).toBe('sess_1');
  });
});
