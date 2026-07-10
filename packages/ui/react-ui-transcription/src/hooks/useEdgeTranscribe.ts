//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { createEdgeIdentity } from '@dxos/client/edge';
import { Context } from '@dxos/context';
import { EdgeHttpClient, type TranscribeAudioResponse } from '@dxos/edge-client';
import { type TranscribeFn, type WhisperSegment } from '@dxos/pipeline-transcription';
import { useClient } from '@dxos/react-client';

/**
 * {@link TranscribeFn} bound to the current identity, routed through calls-service's authenticated
 * `/transcribe` proxy (the endpoint requires a verifiable presentation — a raw unauthenticated fetch is
 * rejected).
 */
export const useEdgeTranscribe = (): TranscribeFn => {
  const client = useClient();
  return useMemo(() => {
    // Deferred to the first actual call: resolving `runtime.services.edge.url` eagerly would throw in any
    // harness/story that renders a transcription surface without configuring edge, even when no audio is
    // ever sent.
    let httpClient: EdgeHttpClient | undefined;
    return async (audio: string, options?: { signal?: AbortSignal }): Promise<WhisperSegment[]> => {
      httpClient ??= new EdgeHttpClient(client.config.getOrThrow('runtime.services.edge.url'));
      // `createEdgeIdentity` needs both halves; the device can lag the identity (device join/recovery).
      if (client.halo.identity.get() && client.halo.device) {
        httpClient.setIdentity(createEdgeIdentity(client));
      }
      // `_call` resolves to undefined for no-content/non-JSON successes; fold that into the
      // invalid-payload error instead of a destructuring TypeError.
      const response: TranscribeAudioResponse | undefined = await httpClient.transcribeAudio(
        new Context(),
        { audio },
        { signal: options?.signal },
      );
      const segments = response?.segments;
      if (!Array.isArray(segments)) {
        throw new Error('Transcription response payload is invalid');
      }
      // `EdgeHttpClient` types the wire payload as `unknown[]` to avoid depending on this package; the
      // Whisper response shape is only known here, at the boundary where the caller expects it.
      return segments as WhisperSegment[];
    };
  }, [client]);
};
