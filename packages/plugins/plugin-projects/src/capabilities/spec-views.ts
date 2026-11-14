//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';

import { ProjectCapabilities } from '#types';

import { SPEC_VIEWS } from '../companion-views.ts';

/** The views of a spec that read any dialect's blocks, so every spec is offered them. */
export default Capability.makeModule(() =>
  Effect.succeed(
    SPEC_VIEWS.map((view) => Capability.contribute(ProjectCapabilities.SpecView, { ...view, dialects: [] })),
  ),
);
