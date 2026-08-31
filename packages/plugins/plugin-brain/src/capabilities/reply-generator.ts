//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as InboxCapabilities from '@dxos/plugin-inbox/InboxCapabilities';

import { BrainOperation } from '#types';

/**
 * Contributes AI reply drafting to plugin-inbox's message surfaces.
 *
 * The generator grounds its draft on the space fact store, which brain owns, while the surfaces that
 * offer it are inbox's — and the dependency runs brain → inbox, so a direct call from the surface
 * would invert it. Without this contribution the AI-reply affordance is absent rather than present
 * and failing.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(InboxCapabilities.ReplyGenerator, {
      id: 'brain',
      getOperation: () => BrainOperation.GenerateReply,
    });
  }),
);
