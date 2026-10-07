//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export * from './BookingSearch/index.ts';

export const SegmentArticle: ComponentType<any> = lazy(() => import('./SegmentArticle/index.ts'));
export const TripArticle: ComponentType<any> = lazy(() => import('./TripArticle/index.ts'));
