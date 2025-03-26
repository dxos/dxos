//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { createIntent, Surface, useIntentDispatcher } from '@dxos/app-framework';
import { TranscriptionAction } from '@dxos/plugin-transcription/types';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { IconButton, Toolbar, useTranslation } from '@dxos/react-ui';
import { StackItem } from '@dxos/react-ui-stack';
import { Tabs } from '@dxos/react-ui-tabs';

import { MEETING_PLUGIN } from '../meta';
import { type MeetingType } from '../types';

export const MeetingContainer = ({ meeting }: { meeting: MeetingType }) => {
  const { t } = useTranslation(MEETING_PLUGIN);
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const [activeTab, setActiveTab] = useState<string>('transcript');
  const transcript = meeting.transcript?.target;
  const notes = meeting.notes?.target;
  const summary = meeting.summary?.target;

  // TODO(dmaretskyi): Pending state and errors should be handled by the framework!!!
  const [isSummarizing, setIsSummarizing] = useState(false);
  const handleSummarize = useCallback(async () => {
    if (!transcript || !summary) {
      return;
    }

    setIsSummarizing(true);
    try {
      const { data: summaryText, error } = await dispatch(
        createIntent(TranscriptionAction.Summarize, { transcript, context: notes?.content }),
      );
      summary.content = summaryText ?? error?.message ?? t('summarizing transcript error');
      setActiveTab('summary');
    } finally {
      setIsSummarizing(false);
    }
  }, [transcript, summary, notes, dispatch, t]);

  return (
    <StackItem.Content toolbar={false} classNames='relative'>
      <Toolbar.Root classNames='absolute block-start-1 inline-end-1 z-[1] is-min'>
        <IconButton
          icon='ph--book-open-text--regular'
          size={5}
          disabled={isSummarizing}
          label={t(isSummarizing ? 'summarizing label' : 'summarize label')}
          onClick={handleSummarize}
        />
      </Toolbar.Root>
      <Tabs.Root orientation='horizontal' value={activeTab} onValueChange={setActiveTab} classNames='flex flex-col'>
        <Tabs.Tablist>
          <Tabs.Tab value='transcript'>{t('transcript tab label')}</Tabs.Tab>
          <Tabs.Tab value='notes'>{t('notes tab label')}</Tabs.Tab>
          <Tabs.Tab value='summary'>{t('summary tab label')}</Tabs.Tab>
        </Tabs.Tablist>
        <Tabs.Tabpanel value='transcript' classNames='grow'>
          {transcript && <Surface role='section' data={{ subject: transcript }} />}
        </Tabs.Tabpanel>
        <Tabs.Tabpanel value='notes' classNames='grow'>
          {notes && <Surface role='section' data={{ id: fullyQualifiedId(meeting), subject: notes }} />}
        </Tabs.Tabpanel>
        <Tabs.Tabpanel value='summary' classNames='grow'>
          {summary && <Surface role='section' data={{ id: fullyQualifiedId(meeting), subject: summary }} />}
        </Tabs.Tabpanel>
      </Tabs.Root>
    </StackItem.Content>
  );
};

export default MeetingContainer;
