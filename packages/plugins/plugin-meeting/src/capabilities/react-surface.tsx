//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useSettingsState } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Channel } from '@dxos/plugin-thread/types';

import { MeetingSettings } from '#components';
import { MeetingContainer, MeetingsList } from '#containers';
import { meta } from '#meta';
import { Meeting, Settings } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'plugin-settings',
        role: 'article',
        filter: AppSurface.settingsArticle(meta.id),
        component: ({ data: { subject } }) => {
          const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);
          return <MeetingSettings settings={settings} onSettingsChange={updateSettings} />;
        },
      }),
      Surface.create({
        id: 'meeting',
        role: 'article',
        filter: AppSurface.objectArticle(Meeting.Meeting),
        component: ({ role, data }) => (
          <MeetingContainer role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: 'meeting-companion',
        role: 'article',
        filter: (data): data is { subject: Meeting.Meeting | 'meeting'; companionTo: Channel.Channel } =>
          (Obj.instanceOf(Meeting.Meeting, data.subject) || data.subject === 'meeting') &&
          Obj.instanceOf(Channel.Channel, data.companionTo),
        component: ({ role, data }) => {
          return data.subject === 'meeting' ? (
            <MeetingsList companionTo={data.companionTo} />
          ) : (
            <MeetingContainer role={role} subject={data.subject} />
          );
        },
      }),
    ]),
  ),
);
