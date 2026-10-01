//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, type Obj, Ref } from '@dxos/echo';
import { Milestone, Task, TaskSet } from '@dxos/types';

import { type PersonKey, type PersonMap } from './people.ts';

//
// Task sets — one per project. Tasks with no assignee are written as self-contained briefs an agent
// can pick up from the task's "delegate" action; the rest belong to someone on the team.
//

type TaskSeed = Omit<Obj.MakeProps<typeof Task.Task>, 'milestone' | 'assignee'> & {
  readonly milestone?: string;
  readonly assignee?: PersonKey;
};

type LedgerSeed = {
  readonly name: string;
  readonly description: string;
  readonly milestones: ReadonlyArray<{ readonly key: string; readonly name: string; readonly description: string }>;
  readonly tasks: ReadonlyArray<TaskSeed>;
};

export type Ledger = { taskSet: TaskSet.TaskSet; tasks: Task.Task[]; milestones: Milestone.Milestone[] };

const LEDGERS = {
  springBlend: {
    name: 'Spring Blend Launch',
    description: 'New seasonal espresso blend targeting wholesale espresso bars. Going live in 6 weeks.',
    milestones: [
      {
        key: 'roast',
        name: 'Roast locked',
        description: 'Curve signed off and reproducible on the production roaster.',
      },
      { key: 'launch', name: 'Launch', description: 'Preorders open and samples with every wholesale account.' },
    ],
    tasks: [
      {
        title: 'Source green coffee — Esperanza + Guatemalan parcel',
        milestone: 'roast',
        status: 'done',
        priority: 'high',
        assignee: 'diego',
        description: 'Lock contracts with Carmen and the importer for the Guatemalan parcel.',
      },
      {
        title: 'Finalize roast curve (v3)',
        milestone: 'roast',
        status: 'started',
        priority: 'high',
        assignee: 'kai',
        description: 'Currently on v2 with adjusted development time. One more iteration before sign-off.',
      },
      {
        title: 'Send v2 samples to wholesalers',
        milestone: 'launch',
        status: 'started',
        priority: 'medium',
        assignee: 'sam',
        description: 'North Star, Hatch, Olive & Vine. 2 lb each.',
      },
      {
        title: 'Design label — Letterform Press',
        milestone: 'launch',
        status: 'started',
        priority: 'medium',
        assignee: 'riley',
        description: 'Final draft due to the printer in 10 days.',
      },
      {
        title: 'Schedule launch cuppings (Oakland + remote)',
        milestone: 'launch',
        status: 'todo',
        priority: 'medium',
        assignee: 'sam',
      },
      {
        title: 'Draft the product page and preorder announcement',
        milestone: 'launch',
        status: 'todo',
        priority: 'medium',
        description:
          'Write the webshop product page for the Spring Blend and a short preorder note for subscribers, as one ' +
          'markdown document filed in this project. Take the flavor profile from the tasting protocol and the ' +
          'cupping notes, the price from the wholesale terms, and the voice from "About Bramble Coffee Roasters": ' +
          'warm, plainspoken, no jargon. Under 300 words for the page, under 120 for the note.',
      },
      {
        title: 'Publish product page + open preorders',
        milestone: 'launch',
        status: 'todo',
        priority: 'low',
        assignee: 'riley',
        description: 'Webshop + email blast to subscribers.',
      },
    ],
  },

  sourcingTrip: {
    name: 'Q2 Sourcing Trip',
    description: "Diego's two weeks in Huila and Sidamo: visit the partner farms, cup the new harvest, lock the lots.",
    milestones: [
      { key: 'booked', name: 'Trip booked', description: 'Flights, drivers and every farm visit confirmed.' },
      { key: 'contracts', name: 'Lots contracted', description: 'Signed contracts for every lot we commit to.' },
    ],
    tasks: [
      {
        title: 'Confirm Finca Esperanza visit dates with Carmen',
        milestone: 'booked',
        status: 'done',
        priority: 'high',
        assignee: 'diego',
      },
      {
        title: 'Book flights and drivers — Bogotá, Neiva, Addis Ababa',
        milestone: 'booked',
        status: 'started',
        priority: 'high',
        assignee: 'diego',
      },
      {
        title: 'Confirm Sidamo washing-station visits with Abel',
        milestone: 'booked',
        status: 'todo',
        priority: 'medium',
        assignee: 'diego',
        description:
          'The cooperative plus two member washing stations; cup the new harvest in Addis before flying home.',
      },
      {
        title: 'Write a pre-trip brief for each farm',
        milestone: 'booked',
        status: 'todo',
        priority: 'medium',
        description:
          'One markdown document filed in this project, with a section per stop (Finca Esperanza, Sidamo ' +
          'Cooperative, the Cajamarca producer). For each: who we deal with, what we have bought and at what ' +
          'price, the latest cupping scores, open questions, and current harvest and weather conditions from the ' +
          'web. Use the itinerary, the cupping notes and the organizations and people in this space. Keep each ' +
          'section to one screen.',
      },
      {
        title: 'Video call with the Cajamarca producer (Peru)',
        status: 'todo',
        priority: 'low',
        assignee: 'diego',
        description: 'Importer intro. We have a small sample lot on hand; decide whether it earns a visit next year.',
      },
      {
        title: 'Lock 18 bags from Esperanza (+6 of the new lot if it cups above 87)',
        milestone: 'contracts',
        status: 'todo',
        priority: 'high',
        assignee: 'diego',
      },
      {
        title: 'Confirm the Sidamo Lot #42 container',
        milestone: 'contracts',
        status: 'todo',
        priority: 'high',
        assignee: 'diego',
        description: "Abel's pricing is in. Optionally add a smaller naturals lot.",
      },
    ],
  },

  oliveAndVine: {
    name: 'Olive & Vine Onboarding',
    description: 'Bring our newest wholesale account in Austin from samples to a standing order.',
    milestones: [{ key: 'firstOrder', name: 'First order', description: 'Mateo places a first paid order.' }],
    tasks: [
      {
        title: 'Send the sampler — Linden, Field Notes, current single-origin',
        milestone: 'firstOrder',
        status: 'done',
        priority: 'medium',
        assignee: 'kai',
      },
      {
        title: 'Onboarding call with Mateo — pricing and ordering',
        milestone: 'firstOrder',
        status: 'todo',
        priority: 'high',
        assignee: 'sam',
      },
      {
        title: 'Draft the Olive & Vine welcome packet',
        milestone: 'firstOrder',
        status: 'todo',
        priority: 'medium',
        description:
          'Fill in the "Olive & Vine welcome packet" draft in this project: a Linden espresso recipe for a ' +
          'two-group bar, how and when to order, the pricing tier from the wholesale terms, and delivery timing to ' +
          'Austin. Mateo runs a wine bar that also pours coffee, so keep it short and practical.',
      },
      {
        title: 'Add Olive & Vine to the three-week reorder schedule',
        status: 'todo',
        priority: 'low',
        assignee: 'sam',
      },
    ],
  },

  roasteryOps: {
    name: 'Roastery Ops',
    description: 'Keeping both roasters running and the production schedule honest.',
    milestones: [],
    tasks: [
      {
        title: 'Replace the sample roaster igniter',
        status: 'blocked',
        priority: 'high',
        assignee: 'riley',
        description: 'Part is backordered with the manufacturer; earliest ship date is three weeks out.',
      },
      {
        title: 'Move sample and dev batches onto the Loring',
        status: 'done',
        priority: 'medium',
        assignee: 'kai',
        description: 'Small batches on the production roaster until the sample roaster is back.',
      },
      {
        title: 'Hire a part-time roastery assistant',
        status: 'started',
        priority: 'medium',
        assignee: 'kai',
        description: 'Whoever we hire reads the Roastery Handbook collection in their first week.',
      },
      {
        title: 'Write a maintenance checklist for both roasters',
        status: 'todo',
        priority: 'medium',
        description:
          'One markdown checklist filed in this project, split into daily, weekly and quarterly jobs: chaff ' +
          'collector, exhaust and cyclone cleaning, burner and igniter checks, thermocouple calibration, bearing ' +
          'grease. Note which jobs need the roaster cold and who on the team owns each.',
      },
      {
        title: 'Summarize the past week of roasts',
        status: 'todo',
        priority: 'low',
        description:
          'Read the roast log entries from the last seven days and write a short markdown report in this project: ' +
          'batches by status, any batch whose notes flag a problem, and what is planned next. The "Weekly roast ' +
          'report" routine does the same on a schedule once it is enabled.',
      },
    ],
  },
} satisfies Record<string, LedgerSeed>;

export type LedgerKey = keyof typeof LEDGERS;

const makeLedger = (seed: LedgerSeed, people: PersonMap): Ledger => {
  const taskSet = TaskSet.make({ name: seed.name, description: seed.description });
  const milestoneByKey = new Map(seed.milestones.map(({ key, ...props }) => [key, Milestone.make(props)] as const));
  const tasks = seed.tasks.map(({ milestone, assignee, ...props }) => {
    const target = milestone === undefined ? undefined : milestoneByKey.get(milestone);
    return Task.make({
      ...props,
      ...(target && { milestone: Ref.make(target) }),
      ...(assignee && { assignee: { contact: Ref.make(people[assignee]) } }),
    });
  });

  return { taskSet, tasks, milestones: [...milestoneByKey.values()] };
};

/**
 * Every project's ledger. TaskSet/Task/Milestone are not collection-item types, so they live
 * directly in the space DB; membership and order are the set's own arrays.
 */
export type TaskSetsResult = Record<LedgerKey, Ledger>;

export const TaskSets: SampleSpace.Phase<TaskSetsResult, PersonMap> = SampleSpace.phase('taskSets', {
  schemas: [TaskSet.TaskSet, Task.Task, Milestone.Milestone],
  run: (people: PersonMap) =>
    Effect.gen(function* () {
      const entries: Array<[LedgerKey, Ledger]> = [];
      for (const [key, seed] of Object.entries(LEDGERS) as Array<[LedgerKey, LedgerSeed]>) {
        const ledger = makeLedger(seed, people);
        yield* Database.add(ledger.taskSet);
        yield* SampleSpace.children(ledger.taskSet, ledger.milestones, (taskSet, refs) => {
          taskSet.milestones = refs;
        });
        yield* SampleSpace.children(ledger.taskSet, ledger.tasks, (taskSet, refs) => {
          taskSet.tasks = refs;
        });
        entries.push([key, ledger]);
      }
      return Object.fromEntries(entries) as TaskSetsResult;
    }),
});
