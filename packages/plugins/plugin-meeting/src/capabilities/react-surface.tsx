//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { SettingsStore } from '@dxos/local-storage';
import { ChannelType } from '@dxos/plugin-thread/types';

import { MeetingContainer, MeetingSettings, MeetingsList } from '../components';
import { meta } from '../meta';
import { Meeting } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${meta.id}/plugin-settings`,
      role: 'article',
      filter: (data): data is { subject: SettingsStore<Meeting.Settings> } =>
        data.subject instanceof SettingsStore && data.subject.prefix === meta.id,
      component: ({ data: { subject } }) => <MeetingSettings settings={subject.value} />,
    }),
    createSurface({
      id: `${meta.id}/meeting`,
      role: 'article',
      filter: (data): data is { subject: Meeting.Meeting } => Obj.instanceOf(Meeting.Meeting, data.subject),
      component: ({ data }) => <MeetingContainer meeting={data.subject} />,
    }),
    createSurface({
      id: `${meta.id}/meeting-companion`,
      role: 'article',
      filter: (data): data is { subject: Meeting.Meeting | 'meeting'; companionTo: ChannelType } =>
        (Obj.instanceOf(Meeting.Meeting, data.subject) || data.subject === 'meeting') &&
        Obj.instanceOf(ChannelType, data.companionTo),
      component: ({ data }) => {
        return data.subject === 'meeting' ? (
          <MeetingsList channel={data.companionTo} />
        ) : (
          <MeetingContainer meeting={data.subject} />
        );
      },
    }),
  ]);
