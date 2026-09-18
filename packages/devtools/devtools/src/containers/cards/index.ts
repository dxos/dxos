//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export * from './DatabaseCard/index.ts';
export * from './EdgeCard/index.ts';
export * from './MemoryCard/index.ts';
export * from './NetworkCard/index.ts';
export * from './PerformanceCard/index.ts';
export * from './QueriesCard/index.ts';
export * from './ReplicatorCard/index.ts';
export * from './ReplicatorMessagesCard/index.ts';
export * from './SurfaceProfilerCard/index.ts';
export * from './SwarmTraceCard/index.ts';
export * from './SyncCard/index.ts';

/** chart.js and its adapters (~250 KB) load with the card, not with the devtools barrel. */
export const TimeSeriesCard: ComponentType<{}> = lazy(() => import('./TimeSeriesCard/index.ts'));
