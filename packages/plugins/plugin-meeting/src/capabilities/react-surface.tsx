//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { isInstanceOf } from '@dxos/echo-schema';
import { ChannelType } from '@dxos/plugin-space/types';

import { ActivityContainer, CallSidebar, MeetingContainer } from '../components';
import { MEETING_PLUGIN } from '../meta';
import { MeetingType } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${MEETING_PLUGIN}/article`,
      role: 'article',
      filter: (data): data is { subject: MeetingType } => isInstanceOf(MeetingType, data.subject),
      component: ({ data }) => <MeetingContainer meeting={data.subject} />,
    }),
    createSurface({
      id: `${MEETING_PLUGIN}/activity`,
      role: 'channel-activity--meeting',
      filter: (data): data is { subject: ChannelType } => isInstanceOf(ChannelType, data.subject),
      component: ({ data }) => <ActivityContainer channel={data.subject} />,
    }),
    createSurface({
      id: `${MEETING_PLUGIN}/assistant`,
      role: 'complementary--meeting',
      component: () => <CallSidebar />,
    }),
  ]);
