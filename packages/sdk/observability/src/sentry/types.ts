//
// Copyright 2022 DXOS.org
//

import type { Event, SamplingContext, Transport } from '@sentry/types';

export type InitOptions = {
  enable?: boolean;
  destination?: string;
  installationId?: string;
  release?: string;
  environment?: string;
  sampleRate?: number;
  tracing?: boolean;
  tracesSampler?: (samplingContext: SamplingContext) => number;
  profiling?: boolean;
  // NOTE: This is relative to the trace sample.
  profilesSampleRate?: number;
  replay?: boolean;
  replaySampleRate?: number;
  replaySampleRateOnError?: number;
  scrubFilenames?: boolean;
  properties?: object;
  transport?: () => Transport;
  onError?: (event: Event) => void;
};
