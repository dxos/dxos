//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as AgentOperation from '@dxos/assistant-toolkit/AgentOperation';
import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import * as Routine from '@dxos/compute/Routine';
import * as Skill from '@dxos/compute/Skill';
import * as Trigger from '@dxos/compute/Trigger';
import { Database, Ref } from '@dxos/echo';

import { type Provides as TeamProvides } from '../team/index.ts';
import { type InboxCrmLinks } from './projects.ts';
import { type ProjectKey } from './tasks.ts';

const NIGHTLY_TRIAGE = [
  'Sweep what came in since the last run and file a task for anything that needs one.',
  [
    'Read the inbox and the open issues in alien-labs/cairn that no task covers. For each one that asks for work,',
    'file a task in the project it belongs to (cache, billing or SOC 2), assign it to the person or agent who owns',
    'that area, and label the issue triaged. File nothing for newsletters, CI noise or anything already tracked.',
  ].join(' '),
].join('\n\n');

export type RoutinesInput = {
  readonly team: TeamProvides;
  readonly projects: Record<ProjectKey, Project.Project>;
  readonly inboxCrm?: InboxCrmLinks;
};

/** Triage's nightly sweep, on the cache project; disabled so a sample space spends no credits. */
export const makeRoutines = ({ team, projects, inboxCrm }: RoutinesInput) =>
  Effect.gen(function* () {
    const instructions = Instructions.make({
      name: 'Nightly triage',
      text: NIGHTLY_TRIAGE,
      skills: ['org.dxos.skill.project', 'org.dxos.skill.database', ...(inboxCrm ? ['org.dxos.skill.inbox'] : [])].map(
        (key) => Ref.fromURI(Skill.registryURI(key)),
      ),
      objects: [
        Ref.make(team.agents.triage),
        Ref.make(projects.cache),
        Ref.make(projects.billing),
        Ref.make(projects.soc2),
        ...(inboxCrm ? [Ref.make(inboxCrm.mailbox)] : []),
      ],
    });
    const trigger = Trigger.make({
      enabled: false,
      spec: Trigger.specTimer('0 2 * * *'),
      runnable: Ref.fromURI(AgentOperation.RunInstructions.meta.key),
      input: { input: {}, instructions: Ref.make(instructions) },
    });
    const routine = Routine.make({
      name: 'Nightly triage',
      description: 'Triage reads the inbox and open issues every night at 02:00 UTC and files tasks.',
      spec: { kind: 'instructions', instructions: Ref.make(instructions) },
      triggers: [Ref.make(trigger)],
    });
    yield* Database.add(routine);
    Project.addRoutine(projects.cache, routine);
    return { triage: routine };
  });
