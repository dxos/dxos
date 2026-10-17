//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import * as Agent from '@dxos/assistant/Agent';
import * as Instructions from '@dxos/compute/Instructions';
import { Database, Obj, Ref } from '@dxos/echo';
import { IdentityDid } from '@dxos/keys';

import { type Make } from '../util.ts';

const AGENT_SEEDS = [
  { key: 'builder', name: 'Builder', instructions: 'Write code on a branch and open a pull request for each task.' },
  { key: 'reviewer', name: 'Reviewer', instructions: 'Review pull requests and run the test suite before approving.' },
  { key: 'triage', name: 'Triage', instructions: 'Read new issues and the inbox; file and label a task for each.' },
  { key: 'scribe', name: 'Scribe', instructions: 'Draft docs, release notes and policy text from the work done.' },
] as const;

export type AgentKey = (typeof AGENT_SEEDS)[number]['key'];

export type Agents = Record<AgentKey, Agent.Agent>;

/** A stable DID per agent, so a rebuild attributes work to the same identities. */
const didFor = (key: string): IdentityDid => {
  const bytes = new Uint8Array(IdentityDid.byteLength);
  new TextEncoder().encode(`fieldstone:${key}`).forEach((byte, index) => {
    bytes[index % bytes.length] ^= byte;
  });
  return IdentityDid.encode(bytes);
};

export const makeAgents = (): Make<Agents> =>
  SampleSpace.seed(AGENT_SEEDS, (seed) =>
    Effect.gen(function* () {
      const instructions = yield* Database.add(Instructions.make({ text: seed.instructions }));
      return yield* Database.add(
        Obj.make(Agent.Agent, {
          name: seed.name,
          did: didFor(seed.key),
          enabled: true,
          instructions: Ref.make(instructions),
        }),
      );
    }),
  );
