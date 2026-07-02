//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppSpace } from '@dxos/app-toolkit';
import { ClientCapabilities } from '@dxos/plugin-client';
import { type EntityLookup, makeDatabaseLookup } from '@dxos/pipeline-transcription';

import { TranscriptionCapabilities } from '#types';

/**
 * Contributes an {@link EntityLookup} backed by the personal space's full-text index. Resolved lazily
 * per call so it reflects the current space. Consumers (e.g. the live-transcription driver) depend on
 * this function rather than the database — swap the backend (vector, space-aware, remote) here.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;
    const lookup: EntityLookup = async (noun, context) => {
      const client = capabilities.get(ClientCapabilities.Client);
      const space = AppSpace.getPersonalSpace(client);
      if (!space) {
        return [];
      }
      return makeDatabaseLookup(space.db)(noun, context);
    };
    return Capability.contributes(TranscriptionCapabilities.EntityLookup, lookup);
  }),
);
