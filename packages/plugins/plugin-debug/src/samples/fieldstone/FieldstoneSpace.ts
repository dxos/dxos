//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import * as Architecture from '@dxos/plugin-canvas/Architecture';

import * as Docs from './docs/index.ts';
import * as InboxCrm from './inbox-crm/index.ts';
import * as Metrics from './metrics/index.ts';
import * as Projects from './projects/index.ts';
import * as Team from './team/index.ts';
import { REFERENCE } from './util.ts';

const partials = {
  team: Team.Partial,
  inboxCrm: InboxCrm.Partial,
  projects: Projects.Partial,
  docs: Docs.Partial,
  metrics: Metrics.Partial,
  architecture: Architecture.Partial,
};

export type Result = {
  readonly team: Team.Provides;
  readonly inboxCrm: InboxCrm.Provides;
  readonly projects: Projects.Provides;
  readonly docs: Docs.Provides;
  readonly metrics: Metrics.Provides;
  readonly architecture: Architecture.Provides;
};

export const make = (): SampleSpace.Definition<typeof partials, Result> =>
  SampleSpace.make({
    space: { name: 'Alien Labs', icon: 'users-three', hue: 'teal' },
    reference: REFERENCE,
    partials,
    build: (partials) =>
      Effect.gen(function* () {
        const team = yield* partials.team();
        const inboxCrm = yield* partials.inboxCrm({ team });
        const projects = yield* partials.projects({ team, inboxCrm });
        const architecture = yield* partials.architecture();
        const docs = yield* partials.docs({ team, inboxCrm, projects, architecture });
        const metrics = yield* partials.metrics();
        return { team, inboxCrm, projects, docs, metrics, architecture };
      }),
  });

export const makeTemplate = (): AppCapabilities.SpaceTemplate =>
  SampleSpace.makeTemplate({
    id: 'org.dxos.plugin-debug.template.fieldstone',
    description:
      'A software team run largely by agents: two months of mail, a year of calendar, projects with their agent runs, shared docs, and charted metrics.',
    definition: make(),
  });
