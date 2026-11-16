//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import { ProjectView } from '#types';

/** A follower shows the tab, spec and chart the leader has open in each project. */
export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(AppCapabilities.Followable, AppCapabilities.makeFollowable({ aspect: ProjectView.aspect })),
  ),
);
