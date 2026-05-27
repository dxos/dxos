//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useSettingsState } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { Channel } from '@dxos/types';

import { MeetingSettings } from '#components';
import { MeetingArticle, MeetingsList } from '#containers';
import { meta } from '#meta';
import { Meeting, Settings } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: DXN.make('org.dxos.plugin.meeting.surface.pluginSettings'),
        filter: AppSurface.settings(AppSurface.Article, meta.id),
        component: ({ data: { subject } }) => {
          const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);
          return <MeetingSettings settings={settings} onSettingsChange={updateSettings} />;
        },
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.meeting.surface.meeting'),
        filter: AppSurface.object(AppSurface.Article, Meeting.Meeting),
        component: ({ role, data }) => (
          <MeetingArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.meeting.surface.meetingCompanion'),
        role: 'article',
        filter: (data): data is { subject: Meeting.Meeting | 'meeting'; companionTo: Channel.Channel } =>
          (Obj.instanceOf(Meeting.Meeting, data.subject) || data.subject === 'meeting') &&
          Obj.instanceOf(Channel.Channel, data.companionTo),
        component: ({ role, data }) => {
          return data.subject === 'meeting' ? (
            <MeetingsList companionTo={data.companionTo} />
          ) : (
            <MeetingArticle role={role} subject={data.subject} />
          );
        },
      }),
    ]),
  ),
);
