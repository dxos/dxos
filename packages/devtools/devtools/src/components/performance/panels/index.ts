//
// Copyright 2024 DXOS.org
//

import { type ComponentType, lazy } from 'react';

import { type CustomPanelProps } from '../Panel';

export * from './Database';
export * from './EdgePanel';
export * from './MemoryPanel';
export * from './NetworkPanel';
export * from './PerformancePanel';
export * from './QueriesPanel';
export * from './RawQueriesPanel';
export * from './SurfaceProfilerPanel';
export * from './SwarmTracePanel';
export * from './SyncStatus';

/**
 * chart.js and its streaming/luxon adapters (~250 KB) are only needed by this panel, so it loads
 * when rendered rather than with the devtools barrel.
 */
export const TimeSeries: ComponentType<CustomPanelProps<{}>> = lazy(() => import('./TimeSeries'));
