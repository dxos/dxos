//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Ref } from '@dxos/echo';
import { type Actor, RemoteSession, Task } from '@dxos/types';

import { AGENT_ICON, PERSON_ICON, getAssigneeDisplay } from './assignee.ts';

const SESSION_ID = 'session_015UUwMUhDAcqtrhGysm53Yu';

const makeSession = (title?: string) =>
  RemoteSession.make({ sessionId: SESSION_ID, title, state: 'running', started: new Date().toISOString() });

const display = (assignee: Actor.Actor, resolved: { contact?: { fullName: string }; subject?: unknown } = {}) =>
  getAssigneeDisplay({ assignee, agentLabel: 'Agent', ...resolved });

describe('getAssigneeDisplay', () => {
  test('a contact names the assignee over every field of the actor', ({ expect }) => {
    const result = display(
      { role: 'user', name: 'rich', email: 'rich@example.com' },
      { contact: { fullName: 'Rich' } },
    );
    expect(result).toMatchObject({ label: 'Rich', icon: PERSON_ICON, agent: false });
  });

  test('an agent is named by its session title, then its harness', ({ expect }) => {
    const titled = makeSession('Fix the assignee label');
    const assignee: Actor.Actor = { role: 'assistant', name: 'Scout', subject: Ref.make(titled) };
    expect(display(assignee, { subject: titled })).toMatchObject({
      label: 'Fix the assignee label',
      icon: RemoteSession.harnessIcon(titled),
      agent: true,
      session: titled,
    });

    const untitled = makeSession();
    expect(display({ role: 'assistant', subject: Ref.make(untitled) }, { subject: untitled }).label).toEqual(
      'Claude Code',
    );
  });

  test('without a session the actor falls back through name, email and DID', ({ expect }) => {
    expect(display({ role: 'assistant', name: 'Scout', email: 'scout@example.com' }).label).toEqual('Scout');
    expect(display({ role: 'assistant', email: 'scout@example.com' }).label).toEqual('scout@example.com');
    expect(display({ role: 'assistant', identityDid: 'did:halo:abcdefghijklmnop' }).label).toEqual('did:halo:abc…');
  });

  test('an unresolved session is named by the tail of its object id', ({ expect }) => {
    const session = makeSession('Not loaded');
    const result = display({ role: 'assistant', subject: Ref.make(session) });
    expect(result.label).toEqual(`…${session.id.slice(-8)}`);
    expect(result.icon).toEqual(AGENT_ICON);
    expect(result.session).toBeUndefined();
  });

  test('an agent standing for an object that is not a session reads as an agent, not an id', ({ expect }) => {
    // A chat in the app; any loaded object that is not a `RemoteSession` stands in for it here.
    const other = Task.make({ title: 'Conversation' });
    expect(display({ role: 'assistant', subject: Ref.make(other) }, { subject: other })).toMatchObject({
      label: 'Agent',
      icon: AGENT_ICON,
      agent: true,
    });
  });

  test('an agent with nothing to name it by reads as the translated fallback', ({ expect }) => {
    expect(display({ role: 'assistant' })).toMatchObject({ label: 'Agent', icon: AGENT_ICON, agent: true });
    expect(display({ role: 'user' }).label).toBeUndefined();
  });
});
