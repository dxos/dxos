//
// Copyright 2025 DXOS.org
//
// NOTE: This leaf module is re-exported by the `/plugin` stub, so it must not import the
// handler implementations (or anything else heavy) — that would drag the plugin implementation
// into every host's eager module graph.

import { OperationHandlerSet } from '@dxos/compute';

export const SpotlightOperationHandlerSet = OperationHandlerSet.async(() =>
  import('./handlers').then((module) => module.handlers),
);
