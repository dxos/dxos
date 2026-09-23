//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, Ref } from '@dxos/echo';
import { Milestone, type Person, Task, TaskSet } from '@dxos/types';

import { type PersonKey, type PersonMap } from './people.ts';

//
// Task set + tasks
//

//
// Task set + tasks
//

const makeTaskSet = (
  people: Record<PersonKey, Person.Person>,
): { taskSet: TaskSet.TaskSet; tasks: Task.Task[]; milestones: Milestone.Milestone[] } => {
  const taskSet = TaskSet.make({
    name: 'Spring Blend Launch',
    description: 'New seasonal espresso blend targeting wholesale espresso bars. Going live in 6 weeks.',
  });

  const roast = Milestone.make({
    name: 'Roast locked',
    description: 'Curve signed off and reproducible on the production roaster.',
  });
  const launch = Milestone.make({
    name: 'Launch',
    description: 'Preorders open and samples with every wholesale account.',
  });
  const milestones = [roast, launch];

  const tasks: Task.Task[] = [
    Task.make({
      title: 'Source green coffee — Esperanza + Guatemalan parcel',
      milestone: Ref.make(roast),
      status: 'done',
      priority: 'high',
      assignee: { contact: Ref.make(people.diego) },
      description: 'Lock contracts with Carmen and the importer for the Guatemalan parcel.',
    }),
    Task.make({
      title: 'Finalize roast curve (v3)',
      milestone: Ref.make(roast),
      status: 'started',
      priority: 'high',
      assignee: { contact: Ref.make(people.kai) },
      description: 'Currently on v2 with adjusted development time. One more iteration before sign-off.',
    }),
    Task.make({
      title: 'Send v2 samples to wholesalers',
      milestone: Ref.make(launch),
      status: 'started',
      priority: 'medium',
      assignee: { contact: Ref.make(people.sam) },
      description: 'North Star, Hatch, Olive & Vine. 2 lb each.',
    }),
    Task.make({
      title: 'Design label — Letterform Press',
      milestone: Ref.make(launch),
      status: 'started',
      priority: 'medium',
      assignee: { contact: Ref.make(people.riley) },
      description: 'Final draft due to the printer in 10 days.',
    }),
    Task.make({
      title: 'Schedule launch cuppings (Oakland + remote)',
      milestone: Ref.make(launch),
      status: 'todo',
      priority: 'medium',
      assignee: { contact: Ref.make(people.sam) },
    }),
    Task.make({
      title: 'Publish product page + open preorders',
      milestone: Ref.make(launch),
      status: 'todo',
      priority: 'low',
      assignee: { contact: Ref.make(people.riley) },
      description: 'Webshop + email blast to subscribers.',
    }),
  ];

  return { taskSet, tasks, milestones };
};

/**
 * The Spring Blend launch. TaskSet/Task/Milestone are not collection-item types, so they live
 * directly in the space DB; membership and order are the set's own arrays.
 */
export type SpringBlendResult = { taskSet: TaskSet.TaskSet; tasks: Task.Task[]; milestones: Milestone.Milestone[] };

export const SpringBlend: SampleSpace.Phase<SpringBlendResult, PersonMap> = SampleSpace.phase('springBlend', {
  schemas: [TaskSet.TaskSet, Task.Task, Milestone.Milestone],
  run: (people: PersonMap) =>
    Effect.gen(function* () {
      const { taskSet, tasks, milestones } = makeTaskSet(people);
      yield* Database.add(taskSet);
      yield* SampleSpace.children(taskSet, milestones, (taskSet, refs) => {
        taskSet.milestones = refs;
      });
      yield* SampleSpace.children(taskSet, tasks, (taskSet, refs) => {
        taskSet.tasks = refs;
      });
      return { taskSet, tasks, milestones };
    }),
});
