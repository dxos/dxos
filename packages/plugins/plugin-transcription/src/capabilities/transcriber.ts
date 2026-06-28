//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { ClientCapabilities } from '@dxos/plugin-client';
import { createTranscriber } from '@dxos/react-ui-transcription';

import { TranscriptionCapabilities } from '#types';

import { TranscriptionManager } from '../transcriber';

/**
 * Provides the audio transcriber (and the higher-level transcription manager) to the app-framework
 * so other plugins can obtain them via DI. The low-level construction lives in
 * `@dxos/react-ui-transcription`; this module is the provision seam.
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
      const transcriptionManager = new TranscriptionManager({
        edgeClient: client.edge.http,
        messageEnricher,
        registry,
      });

      const identity = client.halo.identity.get();
      if (identity) {
        transcriptionManager.setIdentityDid(identity.did);
      }

      return transcriptionManager;
    };

    return [
      Capability.contributes(TranscriptionCapabilities.TranscriberProvider, createTranscriber),
      Capability.contributes(TranscriptionCapabilities.TranscriptionManagerProvider, transcriptionManagerProvider),
    ];
  }),
);
