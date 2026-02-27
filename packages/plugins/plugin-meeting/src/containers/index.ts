//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const MeetingContainer: ComponentType<any> = lazy(() => import('./MeetingContainer'));
export const MeetingSettings: ComponentType<any> = lazy(() => import('./MeetingSettings'));
export const MeetingsList: ComponentType<any> = lazy(() => import('./MeetingsList'));
