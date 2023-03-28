//
// Copyright 2022 DXOS.org
//

import type { Event, Transport, User } from '@sentry/types';

export type InitOptions = {
  user?: User;
  enable?: boolean;
  destination?: string;
  installationId?: string;
  release?: string;
  environment?: string;
  tracing?: boolean;
  sampleRate?: number;
  replay?: boolean;
  replaySampleRate?: number;
  replaySampleRateOnError?: number;
  scrubFilenames?: boolean;
  properties?: object;
  transport?: () => Transport;
  onError?: (event: Event) => void;
};
