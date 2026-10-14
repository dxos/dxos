//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Ref } from '@dxos/echo';

import { Docs } from './docs.ts';
import { ProjectPhase } from './project.ts';
import { Tasks } from './tasks.ts';
import { People, Team } from './team.ts';
import { REFERENCE } from './util.ts';

const phases = {
  team: Team,
  people: People,
  docs: Docs,
  tasks: Tasks,
  project: ProjectPhase,
};

/**
 * A software-project template: one repository, one work-stream, a two-level task tree, and the
 * documents a project accumulates — a `.mdl` spec with rule and QA-flow blocks, an architecture note
 * carrying a mermaid diagram, and a decision log.
 *
 * The second `SpaceTemplate` definition, and the reason the phase machinery exists: nothing here is
 * shared with the Bramble space except the builder itself — the seeds, the phases and the world are
 * this space's own.
 */
export const make = (): SampleSpace.Definition<typeof phases, void> =>
  SampleSpace.make({
    space: { name: 'Tidepool — Offline sync v2', icon: 'flask', hue: 'cyan' },
    reference: REFERENCE,
    phases,
    build: (phases) =>
      Effect.gen(function* () {
        const organizations = yield* phases.team();
        const people = yield* phases.people(organizations);

        const docs = yield* phases.docs();
        const tasks = yield* phases.tasks(people);
        yield* phases.project({ docs, tasks });

        // The root holds collections only. Project/Repo/TaskSet/Task are not collection-item types,
        // so they live directly in the space DB and surface through the project's own containers.
        yield* SampleSpace.collection('Documents', [
          Ref.make(docs.spec),
          Ref.make(docs.architecture),
          Ref.make(docs.decisions),
        ]);
      }),
  });

export const makeTemplate = (): AppCapabilities.SpaceTemplate =>
  SampleSpace.makeTemplate({
    id: 'org.dxos.plugin-debug.template.tidepool',
    description: 'A work-stream with a two-level task tree, a .mdl spec, an architecture note and a decision log.',
    definition: make(),
  });
