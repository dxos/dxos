//
// Copyright 2024 DXOS.org
//

import { type ComponentType, lazy } from 'react';

import { type CustomPanelProps } from '../Panel.tsx';

export * from './Database/index.ts';
export * from './EdgePanel.tsx';
export * from './MemoryPanel.tsx';
export * from './NetworkPanel.tsx';
export * from './PerformancePanel.tsx';
export * from './QueriesPanel.tsx';
export * from './RawQueriesPanel.tsx';
export * from './SurfaceProfilerPanel.tsx';
export * from './SwarmTracePanel.tsx';
export * from './SyncStatus/index.ts';

/**
 * chart.js and its streaming/luxon adapters (~250 KB) are only needed by this panel, so it loads
 * when rendered rather than with the devtools barrel.
 */
export const TimeSeries: ComponentType<CustomPanelProps<{}>> = lazy(() => import('./TimeSeries.tsx'));
