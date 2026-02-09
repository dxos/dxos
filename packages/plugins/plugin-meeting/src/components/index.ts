//
// Copyright 2023 DXOS.org
//

import { type ComponentType, lazy } from 'react';

import { type MeetingsListProps } from './MeetingsList';

export * from './MeetingSettings';

export const MeetingContainer = lazy(() => import('./MeetingContainer'));
export const MeetingsList = lazy<ComponentType<MeetingsListProps>>(() => import('./MeetingsList'));
