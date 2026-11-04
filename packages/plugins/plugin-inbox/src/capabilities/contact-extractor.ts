//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';

import * as MessageExtractor from '../operations/extractor/index.ts';
import * as InboxCapabilities from '../types/InboxCapabilities.ts';

export default Capability.makeModule(() =>
  Effect.succeed([Capability.contribute(InboxCapabilities.ObjectExtractor, MessageExtractor.ContactMessageExtractor)]),
);
