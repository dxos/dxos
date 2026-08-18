//
// Copyright 2026 DXOS.org
//

import { EdgeServiceName, getEdgeServiceEndpoint } from '@dxos/config';
import { useConfig } from '@dxos/react-client';

/** Transcription service base URL from config; a transcriber built without it rejects on `open()`. */
export const useTranscriptionEndpoint = (): string | undefined =>
  getEdgeServiceEndpoint(useConfig(), EdgeServiceName.Transcription);
