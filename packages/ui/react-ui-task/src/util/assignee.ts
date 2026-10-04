//
// Copyright 2026 DXOS.org
//

import { Obj } from '@dxos/echo';
import { type Actor, type Person, RemoteSession, Task } from '@dxos/types';

/** The glyph for a person assignee. */
export const PERSON_ICON = 'ph--user--regular';

/** The glyph for an assistant whose harness has no mark of its own. */
export const AGENT_ICON = 'ph--robot--regular';

export type AssigneeDisplay = {
  /** Absent only for a non-agent actor that carries nothing to name it by. */
  label?: string;
  icon: string;
  /** Whether an assistant, rather than a person, holds the task. */
  agent: boolean;
  /** The harness session the actor stands for, once its subject resolves to one. */
  session?: RemoteSession.RemoteSession;
};

export type GetAssigneeDisplayProps = {
  assignee: Actor.Actor;
  /** The actor's resolved contact, as `useObject` reads it. */
  contact?: Pick<Person.Person, 'fullName'>;
  /** The actor's resolved subject, whatever type it turns out to be. */
  subject?: unknown;
  /** The translated last resort for an agent with nothing else to name it by. */
  agentLabel: string;
};

/** A DID is long and mostly shared prefix, so the start is the part that tells two apart. */
export const shortDid = (did: string): string => `${did.slice(0, 12)}…`;

/** An id's tail rather than its head: object ids share a timestamp prefix and harness ids a `session_` one. */
export const shortId = (id: string): string => `…${id.slice(-8)}`;

/**
 * How an assignee reads wherever a task names it. An assistant's actor stands for a session rather
 * than a person, so its name falls through the session's own fields before the actor's, and it
 * always has one — an agent that reads as "Agent" says an assistant holds the task but never which.
 */
export const getAssigneeDisplay = ({
  assignee,
  contact,
  subject,
  agentLabel,
}: GetAssigneeDisplayProps): AssigneeDisplay => {
  const session = Obj.instanceOf(RemoteSession.RemoteSession, subject) ? subject : undefined;
  const agent = assignee.role === 'assistant';
  // The id tail stands in for a session's name, so only a session — or a subject not yet loaded, which
  // may be one — is named by it; a resolved chat or service is an agent like any other.
  const sessionId =
    (session && RemoteSession.getSessionId(session)) ??
    (session || subject === undefined ? Task.refEntityId(assignee.subject) : undefined);
  const label =
    contact?.fullName ??
    session?.title ??
    (session && RemoteSession.harnessName(session)) ??
    assignee.name ??
    assignee.email ??
    (assignee.identityDid ? shortDid(assignee.identityDid) : undefined) ??
    (sessionId ? shortId(sessionId) : undefined) ??
    (agent ? agentLabel : undefined);
  const icon = (session && RemoteSession.harnessIcon(session)) ?? (agent ? AGENT_ICON : PERSON_ICON);
  return { label, icon, agent, session };
};
