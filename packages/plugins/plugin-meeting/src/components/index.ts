//
// Copyright 2023 DXOS.org
//

import { type ComponentType, lazy } from 'react';

import { type Channel } from '@dxos/plugin-thread/types';

export const MeetingContainer = lazy(() => import('./MeetingContainer'));
export const MeetingsList = lazy<ComponentType<{ channel: Channel.Channel }>>(() => import('./MeetingsList'));

export * from './MeetingSettings';
