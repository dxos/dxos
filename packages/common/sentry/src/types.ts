//
// Copyright 2022 DXOS.org
//

import type { Event, Transport } from '@sentry/types';

export type InitOptions = {
  destination?: string;
  installationId?: string;
  release?: string;
  environment?: string;
  sampleRate?: number;
  scrubFilenames?: boolean;
  transport?: () => Transport;
  onError?: (event: Event) => void;
};
