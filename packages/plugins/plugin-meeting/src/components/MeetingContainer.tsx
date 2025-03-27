//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { createIntent, Surface, useIntentDispatcher } from '@dxos/app-framework';
import { TranscriptionAction } from '@dxos/plugin-transcription/types';
import { ButtonGroup, IconButton, useTranslation } from '@dxos/react-ui';
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
      <Tabs.Root
        orientation='horizontal'
        value={activeTab}
        onValueChange={setActiveTab}
        classNames='grid grid-rows-[min-content_1fr] [&>[role="tabpanel"]]:min-bs-0 [&>[role="tabpanel"][data-state="active"]]:grid'
      >
        <Tabs.Tablist classNames='border-be border-separator'>
          <Tabs.Tab value='transcript'>{t('transcript tab label')}</Tabs.Tab>
          <Tabs.Tab value='notes'>{t('notes tab label')}</Tabs.Tab>
          <ButtonGroup>
            <Tabs.Tab value='summary'>{t('summary tab label')}</Tabs.Tab>
            <IconButton
              variant={activeTab === 'summary' ? 'default' : 'ghost'}
              icon='ph--arrows-clockwise--regular'
              iconOnly
              size={5}
              disabled={isSummarizing}
              label={t(isSummarizing ? 'summarizing label' : 'summarize label')}
              onClick={handleSummarize}
            />
          </ButtonGroup>
        </Tabs.Tablist>
        <Tabs.Tabpanel value='transcript'>
          {transcript && <Surface role='tabpanel' data={{ subject: transcript }} />}
        </Tabs.Tabpanel>
        <Tabs.Tabpanel value='notes'>
          {notes && <Surface role='tabpanel' data={{ id: meeting.id, subject: notes }} />}
        </Tabs.Tabpanel>
        <Tabs.Tabpanel value='summary'>
          {(summary?.content.length ?? 0) > 0 ? (
            <Surface role='tabpanel' data={{ id: meeting.id, subject: summary }} />
          ) : (
            <div role='none' className='place-self-center is-full min-is-64 max-is-96 p-4'>
              <p>{t('create summary message')}</p>
              <IconButton
                icon='ph--book-open-text--regular'
                size={5}
                disabled={isSummarizing}
                label={t(isSummarizing ? 'summarizing label' : 'summarize label')}
                onClick={handleSummarize}
                classNames='is-full mbs-4'
              />
            </div>
          )}
        </Tabs.Tabpanel>
      </Tabs.Root>
    </StackItem.Content>
  );
};

export default MeetingContainer;
