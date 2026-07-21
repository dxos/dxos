//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capabilities, Capability } from '@dxos/app-framework';
import { ClientCapabilities } from '@dxos/plugin-client';

import { TranscriptionCapabilities } from '#types';

import { TranscriptionManagerImpl } from '../transcription-manager';

/**
 * Provides the higher-level transcription manager to the app-framework so other plugins can obtain it
 * via DI. The low-level construction lives in `@dxos/react-ui-transcription`; this module is the
 * provision seam.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Get context for lazy capability access in callbacks.
    const capabilities = yield* Capability.Service;
    const registry = yield* Capability.get(Capabilities.AtomRegistry);

    const transcriptionManagerProvider: TranscriptionCapabilities.TranscriptionManagerProvider = ({
      messageEnricher,
    }) => {
      const client = capabilities.get(ClientCapabilities.Client);
      const haloIdentity = capabilities.get(ClientCapabilities.IdentityService);
      const transcriptionManager = new TranscriptionManagerImpl({
        edgeClient: client.edge.http,
        messageEnricher,
        registry,
      });

      const identity = Option.getOrUndefined(haloIdentity.getSnapshot());
      if (identity) {
        transcriptionManager.setIdentityDid(identity.did);
      }

      return transcriptionManager;
    };

    return [
      Capability.contributes(TranscriptionCapabilities.TranscriptionManagerProvider, transcriptionManagerProvider),
    ];
  }),
);
