//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capability, Common } from '@dxos/app-framework';
import { useSettingsState } from '@dxos/app-framework/react';
import { Obj } from '@dxos/echo';
import { Channel } from '@dxos/plugin-thread/types';

import { MeetingContainer, MeetingSettings, MeetingsList } from '../../components';
import { meta } from '../../meta';
import { Meeting } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Common.Capability.ReactSurface, [
      Common.createSurface({
        id: `${meta.id}/plugin-settings`,
        role: 'article',
        filter: (data): data is { subject: Common.Capability.Settings } =>
          Common.Capability.isSettings(data.subject) && data.subject.prefix === meta.id,
        component: ({ data: { subject } }) => {
          const { settings, updateSettings } = useSettingsState<Meeting.Settings>(subject.atom);
          return <MeetingSettings settings={settings} onSettingsChange={updateSettings} />;
        },
      }),
      Common.createSurface({
        id: `${meta.id}/meeting`,
        role: 'article',
        filter: (data): data is { subject: Meeting.Meeting } => Obj.instanceOf(Meeting.Meeting, data.subject),
        component: ({ role, data }) => <MeetingContainer role={role} subject={data.subject} />,
      }),
      Common.createSurface({
        id: `${meta.id}/meeting-companion`,
        role: 'article',
        filter: (data): data is { subject: Meeting.Meeting | 'meeting'; companionTo: Channel.Channel } =>
          (Obj.instanceOf(Meeting.Meeting, data.subject) || data.subject === 'meeting') &&
          Obj.instanceOf(Channel.Channel, data.companionTo),
        component: ({ role, data }) => {
          return data.subject === 'meeting' ? (
            <MeetingsList channel={data.companionTo} />
          ) : (
            <MeetingContainer role={role} subject={data.subject} />
          );
        },
      }),
    ]),
  ),
);
