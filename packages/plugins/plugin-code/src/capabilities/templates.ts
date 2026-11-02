//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as ProjectCapabilities from '@dxos/plugin-projects/ProjectCapabilities';

import { featureSpec } from '../templates/feature-spec.ts';

export default Capability.makeModule(() =>
  Effect.succeed(Capability.contribute(ProjectCapabilities.Template, featureSpec)),
);
