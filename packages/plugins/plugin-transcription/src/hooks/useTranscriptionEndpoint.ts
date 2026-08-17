//
// Copyright 2026 DXOS.org
//

import { EdgeServiceName, getEdgeServiceEndpoint } from '@dxos/config';
import { useConfig } from '@dxos/react-client';

/**
 * Transcription service base URL from config. Every browser-side transcriber must be handed this
 * value: there is no built-in endpoint, so a transcriber built without it rejects on `open()`.
 */
export const useTranscriptionEndpoint = (): string | undefined =>
  getEdgeServiceEndpoint(useConfig(), EdgeServiceName.Transcription);
