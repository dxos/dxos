//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Architecture } from '@dxos/plugin-canvas/samples';

import * as Docs from './docs/index.ts';
import * as InboxCrm from './inbox-crm/index.ts';
import * as Projects from './projects/index.ts';
import * as Team from './team/index.ts';
import { REFERENCE } from './util.ts';

const phases = {
  team: Team.Partial,
  inboxCrm: InboxCrm.Partial,
  projects: Projects.Partial,
  docs: Docs.Partial,
  architecture: Architecture.Partial,
};

/** Fieldstone Labs: a software team that runs on agents, with Cairn's architecture diagrams alongside. */
export type Result = {
  readonly team: Team.Provides;
  readonly inboxCrm: InboxCrm.Provides;
  readonly projects: Projects.Provides;
  readonly docs: Docs.Provides;
};

export const make = (): SampleSpace.Definition<typeof phases, Result> =>
  SampleSpace.make({
    space: { name: 'Fieldstone Labs', icon: 'users-three', hue: 'teal' },
    reference: REFERENCE,
    phases,
    build: (phases) =>
      Effect.gen(function* () {
        const team = yield* phases.team();
        const inboxCrm = yield* phases.inboxCrm({ team });
        const projects = yield* phases.projects({ team, inboxCrm });
        const docs = yield* phases.docs({ team, inboxCrm, projects });
        yield* phases.architecture();
        return { team, inboxCrm, projects, docs };
      }),
  });

export const makeTemplate = (): AppCapabilities.SpaceTemplate =>
  SampleSpace.makeTemplate({
    id: 'org.dxos.plugin-debug.template.fieldstone',
    description:
      'A software team run largely by agents: two months of mail, a year of calendar, projects with their agent runs, and shared docs.',
    definition: make(),
  });
