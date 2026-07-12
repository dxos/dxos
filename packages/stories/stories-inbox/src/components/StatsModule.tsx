//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { DebugSurface } from '@dxos/plugin-debug';

/** The transient-stats panel — plugin-debug's surface rendering the sync telemetry store. */
export const StatsModule = () => <Surface.Surface type={DebugSurface.Stats} limit={1} />;
