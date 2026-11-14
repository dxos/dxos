//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Ref } from '@dxos/echo';

import { DocsPartial } from './docs.ts';
import { FeaturesPartial } from './features.ts';
import { ProjectPartial } from './project.ts';
import { SpecPartial } from './spec.ts';
import { REFERENCE } from './util.ts';

const partials = {
  spec: SpecPartial,
  features: FeaturesPartial,
  docs: DocsPartial,
  project: ProjectPartial,
};

/**
 * A finished spec and nothing built: an availability poll on Cloudflare Workers, one Durable Object per poll, staged
 * as three milestones in `SPEC.mdl`, with its feature map, the flight options spec its last feature owns, three design
 * documents and two drawings. The task set is empty, so the reader watches the agent plan each milestone from the
 * spec, works the tasks it files on the Gantt chart, and follows progress on the feature cards.
 *
 * Reachable with no credentials but the reader's own DXOS identity: the Worker deploys to a temporary Cloudflare
 * account, and the one consent screen, claiming it, is the reader's.
 */
export const make = (): SampleSpace.Definition<typeof partials, void> =>
  SampleSpace.make({
    // Reaches a space only where the definition is applied directly (the generator panel, the
    // archive test): the create-space dialog takes its icon from `space-templates.ts`.
    space: { name: 'Availability Poll', icon: 'calendar-dots', hue: 'teal' },
    reference: REFERENCE,
    partials,
    build: (partials) =>
      Effect.gen(function* () {
        const spec = yield* partials.spec();
        yield* partials.features({ spec });
        const docs = yield* partials.docs();
        yield* partials.project({ spec, docs });

        // The root holds collections only; the project, its feature map and its empty task set surface through the
        // project's own containers.
        yield* SampleSpace.collection('Design', [
          Ref.make(docs.docs.zones),
          Ref.make(docs.docs.durable),
          Ref.make(docs.docs.duffel),
          Ref.make(docs.drawings.poll),
          Ref.make(docs.drawings.flights),
        ]);
      }),
  });

export const makeTemplate = (): AppCapabilities.SpaceTemplate =>
  SampleSpace.makeTemplate({
    id: 'org.dxos.plugin-debug.template.availability-poll',
    description:
      'A finished, staged spec for a time-zone-aware availability poll on Cloudflare Workers, with its feature map and design docs and no tasks: the agent plans each milestone from the spec and works it.',
    definition: make(),
  });
