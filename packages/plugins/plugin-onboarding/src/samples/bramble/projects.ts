//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import * as Routine from '@dxos/compute/Routine';
import * as Skill from '@dxos/compute/Skill';
import * as Trigger from '@dxos/compute/Trigger';
import { Database, Obj, Ref } from '@dxos/echo';
import type * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import type * as Markdown from '@dxos/plugin-markdown/Markdown';
import { makeRoutine } from '@dxos/plugin-routine/util';
import { Outline, type TaskSet } from '@dxos/types';

import { type DrawingsResult } from './drawings.ts';
import { type NotesBundle } from './notes.ts';
import { type OrgMap } from './organizations.ts';
import { type TaskSetsResult } from './tasks.ts';

//
// Projects — the four work-streams the space is organized around.
//
// Artifacts hold only types production Composer renders (documents, drawings); the mailbox is bound
// as chat context instead, so each project reads the same with the inbox plugin on or off. A skill
// key with no plugin behind it binds nothing, which makes the inbox skill safe to list.
//
// The project article keeps the instruction text's line breaks, so each paragraph is one line.
//

const BASE_SKILLS = ['org.dxos.skill.markdown', 'org.dxos.skill.database'] as const;

const INBOX_SKILL = 'org.dxos.skill.inbox';

const paragraph = (...sentences: string[]) => sentences.join(' ');

const skillRefs = (keys: ReadonlyArray<string>) => keys.map((key) => Ref.fromURI(Skill.registryURI(key)));

type ProjectSeed = {
  readonly name: string;
  readonly description: string;
  readonly status: Project.ProjectStatus;
  readonly instructions: string;
  readonly skills?: ReadonlyArray<string>;
  readonly objects: ReadonlyArray<Obj.Unknown>;
  readonly artifacts: ReadonlyArray<Obj.Unknown>;
  readonly taskSet: TaskSet.TaskSet;
};

const makeProject = (seed: ProjectSeed): Project.Project => {
  const project = Project.make({
    name: seed.name,
    description: seed.description,
    status: seed.status,
    taskSet: Ref.make(seed.taskSet),
    artifacts: seed.artifacts.map((artifact) => Ref.make(artifact)),
  });
  const instructions = Instructions.make({
    name: 'Instructions',
    text: seed.instructions,
    skills: skillRefs([...BASE_SKILLS, ...(seed.skills ?? [])]),
    objects: seed.objects.map((object) => Ref.make(object)),
  });
  // Ref before parent edge: the ref is what declares the edge (see `Obj.isDeclaredParentEdge`).
  Obj.update(project, (project) => {
    project.instructions = Ref.make(instructions);
  });
  Obj.setParent(instructions, project);
  return project;
};

const WEEKLY_ROAST_REPORT = [
  "Write this week's roast report for Bramble Coffee Roasters.",
  paragraph(
    'Query the space for roast log entries (typename example.type.roastLog) dated in the last seven days.',
    'Create a markdown document titled "Roast report" with the current date and file it into the Roastery Ops',
    "project's artifacts. Cover batches by status, any batch whose notes flag a problem, and what is planned for",
    'the coming week. Keep it under 250 words.',
  ),
].join('\n\n');

export type ProjectsInput = {
  readonly taskSets: TaskSetsResult;
  readonly notes: NotesBundle;
  readonly drawings: DrawingsResult;
  readonly about: Markdown.Document;
  readonly mailbox: Mailbox.Mailbox;
  readonly organizations: OrgMap;
};

export type ProjectsResult = {
  springBlend: Project.Project;
  sourcingTrip: Project.Project;
  oliveAndVine: Project.Project;
  roasteryOps: Project.Project;
};

export const Projects: SampleSpace.Phase<ProjectsResult, ProjectsInput> = SampleSpace.phase('projects', {
  schemas: [Project.Project, Instructions.Instructions, Routine.Routine, Trigger.Trigger, Outline.Outline],
  run: ({ taskSets, notes, drawings, about, mailbox, organizations }) =>
    Effect.gen(function* () {
      const springBlend = makeProject({
        name: 'Spring Blend Launch',
        description: 'New seasonal espresso blend for wholesale espresso bars. Going live in six weeks.',
        status: 'active',
        taskSet: taskSets.springBlend.taskSet,
        instructions: paragraph(
          "This project launches Bramble's Spring Blend, a seasonal espresso blend of Finca Esperanza Lot A and a",
          'Guatemalan parcel. Write in Bramble\'s voice as described in "About Bramble Coffee Roasters": warm,',
          'plainspoken, no jargon. File every document you write into this project.',
        ),
        skills: [INBOX_SKILL],
        objects: [about, mailbox],
        artifacts: [notes.tastingProtocol, notes.cuppingNotes, drawings.flavorWheel, notes.wholesaleTerms],
      });

      const sourcingTrip = makeProject({
        name: 'Q2 Sourcing Trip',
        description: "Diego's two weeks in Huila and Sidamo, plus a call with a new producer in Peru.",
        status: 'active',
        taskSet: taskSets.sourcingTrip.taskSet,
        instructions: paragraph(
          "This project plans Diego's sourcing trip to Finca Esperanza (Huila, Colombia) and the Sidamo Cooperative",
          '(Ethiopia). Use the itinerary and the partner organizations as the source of truth for dates and people;',
          'use web search for harvest and weather conditions, and cite what you find.',
        ),
        skills: ['org.dxos.skill.webSearch', INBOX_SKILL],
        objects: [about, organizations.fincaEsperanza, organizations.sidamoCoop, mailbox],
        artifacts: [notes.itinerary, notes.cuppingNotes],
      });

      const oliveAndVine = makeProject({
        name: 'Olive & Vine Onboarding',
        description: 'Bring our newest wholesale account, in East Austin, from samples to a standing order.',
        status: 'active',
        taskSet: taskSets.oliveAndVine.taskSet,
        instructions: paragraph(
          'This project onboards Olive & Vine, a wine bar in East Austin that also pours coffee. Mateo Ruiz is the',
          'buyer; Sam owns the relationship. Prices, tiers and delivery come from "Wholesale terms"; never quote a',
          'number that is not there.',
        ),
        skills: [INBOX_SKILL],
        objects: [about, organizations.oliveAndVine, mailbox],
        artifacts: [notes.welcomePacket, notes.wholesaleTerms],
      });

      const roasteryOps = makeProject({
        name: 'Roastery Ops',
        description: 'Both roasters, the production schedule and the roast log. Blocked on a backordered part.',
        status: 'blocked',
        taskSet: taskSets.roasteryOps.taskSet,
        instructions: paragraph(
          "This project keeps Bramble's roastery running: a 15 kg Loring for production and a smaller sample roaster,",
          'down until a backordered igniter arrives. Roast batches are recorded as roast log entries (typename',
          'example.type.roastLog); query them rather than guessing.',
        ),
        objects: [about],
        artifacts: [drawings.floorPlan],
      });

      // Disabled: a sample space never spends the user's credits until they turn it on.
      Project.addRoutine(
        roasteryOps,
        makeRoutine({
          name: 'Weekly roast report',
          instructions: Instructions.make({
            name: 'Weekly roast report',
            text: WEEKLY_ROAST_REPORT,
            skills: skillRefs([...BASE_SKILLS, 'org.dxos.skill.project']),
            objects: [Ref.make(roasteryOps)],
          }),
          trigger: Trigger.make({ enabled: false, spec: Trigger.specTimer('0 8 * * 1') }),
        }),
      );

      const projects = { springBlend, sourcingTrip, oliveAndVine, roasteryOps };
      for (const project of Object.values(projects)) {
        yield* Database.add(project);
      }

      return projects;
    }),
});
