//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';

import { type ModuleProps } from './types';

/**
 * Renders the assistant `TracePanel` (process tree + execution-graph timeline) via the
 * `deck-companion--trace` surface, so sub-agent processes spawned by the supervisor surface as
 * nested lanes alongside the chat. The surface resolves the active space internally (set by
 * `ModuleContainer`).
 */
export const TraceModule = (_props: ModuleProps) => {
  return <Surface.Surface role='deck-companion--trace' data={{ subject: 'trace' }} />;
};
