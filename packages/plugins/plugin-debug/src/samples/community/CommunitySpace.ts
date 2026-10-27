//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';

import { ChannelPartial } from './channel.ts';
import { ProjectPartial } from './project.ts';

export * as TriageScript from './triage-script.ts';

/** Stable reference date so regenerations are reproducible. */
const REFERENCE = new Date('2026-10-20T15:00:00Z');

const partials = {
  channel: ChannelPartial,
  project: ProjectPartial,
};

/**
 * A community Discord channel triaged into a project: the routine drafts a reply to each question, for a
 * person to review, and files a task for the work each message asks for. See `CONTENT.md`.
 */
export const make = (): SampleSpace.Definition<typeof partials, void> =>
  SampleSpace.make({
    space: { name: 'Community support', icon: 'users-three', hue: 'indigo' },
    reference: REFERENCE,
    partials,
    build: (partials) =>
      Effect.gen(function* () {
        const channel = yield* partials.channel();
        yield* partials.project({ channel });
      }),
  });

export const makeTemplate = (): AppCapabilities.SpaceTemplate =>
  SampleSpace.makeTemplate({
    id: 'org.dxos.plugin-debug.template.community',
    description:
      'A community Discord channel and a project whose routine drafts replies to questions and files the work each message asks for.',
    definition: make(),
  });
