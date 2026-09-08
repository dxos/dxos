//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Ref } from '@dxos/echo';

import { Docs } from './docs';
import { ProjectPhase } from './project';
import { DevelopmentSkill } from './skill';
import { Tasks } from './tasks';
import { REFERENCE } from './util';

const phases = {
  skill: DevelopmentSkill,
  docs: Docs,
  tasks: Tasks,
  project: ProjectPhase,
};

/**
 * A starting point rather than a finished world: the brief for a chatroom app, the plan to build it
 * as a task tree nothing has started on, and the development-preferences skill a chat working it
 * runs with.
 *
 * The other sample spaces depict a project mid-flight; this one is meant to be RUN. Every task is
 * `todo`, the design artifact the first stage produces is deliberately absent, and no repository is
 * seeded — stage two creates it.
 */
export const ChatroomSpace = (): SampleSpace.Definition<typeof phases, void> =>
  SampleSpace.make({
    // A bare `iconValues` name, which is what `spaces.create` stores and the icon picker reads.
    space: { name: 'Chatroom on Workers', icon: 'users-three', hue: 'emerald' },
    reference: REFERENCE,
    phases,
    build: (phases) =>
      Effect.gen(function* () {
        const skill = yield* phases.skill();
        const docs = yield* phases.docs();
        const tasks = yield* phases.tasks();
        yield* phases.project({ docs, tasks, skill });

        // The root holds collections only. Project/TaskSet/Task/Skill are not collection-item
        // types, so they live directly in the space DB and surface through their own containers.
        yield* SampleSpace.collection('Documents', [Ref.make(docs.brief)]);
      }),
  });
