//
// Copyright 2026 DXOS.org
//

import type * as Capabilities from '@dxos/app-framework/Capabilities';
import type * as Agent from '@dxos/assistant/Agent';
import { type Database, Filter, type Obj, Ref } from '@dxos/echo';
import * as AgentOperation from '@dxos/plugin-agent/AgentOperation';
import * as Memory from '@dxos/plugin-agent/Memory';
import * as MemoryOperation from '@dxos/plugin-agent/MemoryOperation';
import { Organization, Person } from '@dxos/types';

//
// The DXOS team the community-support skill escalates to: who they are and what each one knows best, recorded as
// the agent's memories so the skill finds them with Recall rather than from its own (team-agnostic) instructions.
//

export const SUPPORT_TEAM_NAME = 'DXOS';

export type SupportTeamMember = {
  fullName: string;
  preferredName: string;
  jobTitle: string;
  /** What to send them; each entry becomes one memory, so a topic query finds the right person. */
  expertise: readonly string[];
};

/** From the areas each person has changed most in the dxos and edge repositories. */
export const SUPPORT_TEAM: readonly SupportTeamMember[] = [
  {
    fullName: 'Rich Burdon',
    preferredName: 'Rich',
    jobTitle: 'Founder; product and UI',
    expertise: [
      'the react-ui design system: components, theming, forms (react-ui-form), the editor and the canvas',
      'Composer plugins such as inbox, assistant, markdown, deck and space, and the devtools',
      'product direction, roadmap and anything without an obvious owner',
    ],
  },
  {
    fullName: 'Josiah Witt',
    preferredName: 'Josiah',
    jobTitle: 'Engineer; Composer app and integrations',
    expertise: [
      'the Composer app shell and its plugins: spaces, deck, the client plugin and the app toolkit',
      'integrations and connectors: mail and calendar (plugin-inbox), Discord, scripts, MCP',
      'EDGE account services: the hub, MCP, KMS (stored credentials) and the plugin registry',
    ],
  },
  {
    fullName: 'Dmytro Maretskyi',
    preferredName: 'Dmytro',
    jobTitle: 'Engineer; ECHO, compute and agents',
    expertise: [
      'ECHO: objects, schema, queries, references and the client/host database',
      'the assistant, agents, tools and operations (assistant-toolkit, compute, plugin-assistant)',
      'EDGE data and compute services: db-service, compute-service and functions',
    ],
  },
  {
    fullName: 'Mykola Veremchuk',
    preferredName: 'Mykola',
    jobTitle: 'Engineer; sync, networking and storage',
    expertise: [
      'replication and sync: the ECHO pipeline, indexing and the client services',
      'networking: the EDGE client, messaging and websockets, and the EDGE router',
      'performance, storage and data recovery, and the replication end-to-end tests',
    ],
  },
];

/**
 * Adds the team, its members and their expertise, unless a previous run already did; gives each member a chat with
 * the agent so an escalation delivers somewhere visible in the story.
 */
export const seedSupportTeam = async ({
  db,
  invoker,
  agent,
}: {
  db: Database.Database;
  invoker: Capabilities.OperationInvoker;
  agent: Agent.Agent;
}): Promise<void> => {
  const team =
    (await db.query(Filter.type(Organization.Organization)).run()).find(({ name }) => name === SUPPORT_TEAM_NAME) ??
    db.add(Organization.make({ name: SUPPORT_TEAM_NAME }));
  const existing = new Set((await db.query(Filter.type(Memory.Memory)).run()).map(({ content }) => content));
  const remember = async (content: string, subjects: Ref.Ref<Obj.Unknown>[]) => {
    if (existing.has(content)) {
      return;
    }
    const { error } = await invoker.invokePromise(
      MemoryOperation.Remember,
      { content, kind: 'fact', origin: 'stated', subjects },
      { spaceId: db.spaceId },
    );
    if (error) {
      throw error;
    }
  };

  await remember(`${SUPPORT_TEAM_NAME} is the support team for the community channel.`, [Ref.make<Obj.Unknown>(team)]);
  const people = await db.query(Filter.type(Person.Person)).run();
  for (const { fullName, preferredName, jobTitle, expertise } of SUPPORT_TEAM) {
    const person =
      people.find((person) => person.fullName === fullName) ??
      db.add(Person.make({ fullName, preferredName, jobTitle, organization: Ref.make(team) }));
    for (const area of expertise) {
      await remember(`${fullName} (${SUPPORT_TEAM_NAME}) is the one to ask about ${area}.`, [
        Ref.make<Obj.Unknown>(person),
        Ref.make<Obj.Unknown>(team),
      ]);
    }
    const { error } = await invoker.invokePromise(
      AgentOperation.EnsureParticipantChat,
      { agent: Ref.make(agent), person: Ref.make<Obj.Unknown>(person) },
      { spaceId: db.spaceId },
    );
    if (error) {
      throw error;
    }
  }
  await db.flush({ indexes: true });
};
