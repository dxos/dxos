//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { Surface } from '@dxos/app-framework';
import { toLocalizedString, useTranslation } from '@dxos/react-ui';
import { StackItem } from '@dxos/react-ui-stack';
import { Tabs } from '@dxos/react-ui-tabs';

import { CallContainer } from './CallContainer';
import { MissingArtifact } from './MissingArtifact';
import { useActivityTabs } from '../hooks';
import { MEETING_PLUGIN } from '../meta';
import { type MeetingType } from '../types';

export const MeetingContainer = ({ meeting }: { meeting: MeetingType }) => {
  const { t } = useTranslation(MEETING_PLUGIN);
  const [activeTab, setActiveTab] = useState<string>('call');
  const activityTabs = useActivityTabs(meeting);

  // TODO(wittjosiah): The tabpanels can be blank if plugins are disabled.
  //  Add placeholder with one click to enable required plugins.
  return (
    <StackItem.Content toolbar={false} classNames='relative'>
      <Tabs.Root
        orientation='horizontal'
        value={activeTab}
        onValueChange={setActiveTab}
        classNames='grid grid-rows-[min-content_1fr] [&>[role="tabpanel"]]:min-bs-0 [&>[role="tabpanel"][data-state="active"]]:grid'
      >
        <Tabs.Tablist classNames='border-be border-separator'>
          <Tabs.Tab value='call'>{t('call tab label')}</Tabs.Tab>
          {activityTabs.map(({ typename, label }) => (
            <Tabs.Tab key={typename} value={typename}>
              {toLocalizedString(label, t)}
            </Tabs.Tab>
          ))}
        </Tabs.Tablist>
        <Tabs.Tabpanel value='call'>
          <CallContainer meeting={meeting} />
        </Tabs.Tabpanel>
        {activityTabs.map(({ typename, getIntent, subject }) => (
          <Tabs.Tabpanel key={typename} value={typename}>
            {subject ? (
              <Surface role='tabpanel' data={{ subject }} />
            ) : (
              <MissingArtifact meeting={meeting} getIntent={getIntent} typename={typename} />
            )}
          </Tabs.Tabpanel>
        ))}
      </Tabs.Root>
    </StackItem.Content>
  );
};

export default MeetingContainer;
