//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import * as Agent from '@dxos/assistant/Agent';
import * as Instructions from '@dxos/compute/Instructions';
import { Organization, Person } from '@dxos/types';

import { type Agents, makeAgents } from './agents.ts';
import { makeFieldstone } from './organization.ts';
import { type People, makePeople } from './people.ts';

export type Provides = {
  readonly orgs: { readonly fieldstone: Organization.Organization };
  readonly people: People;
  readonly agents: Agents;
};

/** Alien Labs' people and agents, which the other Alien Labs partials build on. Spec: `CONTENT.md`. */
export const Partial: SampleSpace.Partial<Provides> = SampleSpace.partial('fieldstoneTeam', {
  schemas: [Organization.Organization, Person.Person, Agent.Agent, Instructions.Instructions],
  run: () =>
    Effect.gen(function* () {
      const fieldstone = yield* makeFieldstone();
      const people = yield* makePeople(fieldstone);
      const agents = yield* makeAgents();
      return { orgs: { fieldstone }, people, agents };
    }),
});
