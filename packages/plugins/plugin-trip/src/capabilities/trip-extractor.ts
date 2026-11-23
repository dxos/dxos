//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as InboxCapabilities from '@dxos/plugin-inbox/InboxCapabilities';

import { TripMessageExtractor } from '#operations';

export default Capability.makeModule(() =>
  Effect.succeed([Capability.contribute(InboxCapabilities.ObjectExtractor, TripMessageExtractor)]),
);
