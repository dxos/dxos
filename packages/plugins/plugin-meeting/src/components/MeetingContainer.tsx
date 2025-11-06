//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { createIntent } from '@dxos/app-framework';
import { Surface, useIntentDispatcher } from '@dxos/app-framework/react';
import { Obj } from '@dxos/echo';
import { IconButton, useTranslation } from '@dxos/react-ui';
import { Stack, StackItem } from '@dxos/react-ui-stack';

import { meta } from '../meta';
import { type Meeting, MeetingAction } from '../types';

export type MeetingContainerProps = {
  meeting: Meeting.Meeting;
};

export const MeetingContainer = ({ meeting }: MeetingContainerProps) => {
  const { t } = useTranslation(meta.id);
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const notes = meeting.notes?.target;
  const summary = meeting.summary?.target;
  const notesData = useMemo(() => ({ id: Obj.getDXN(meeting).toString(), subject: notes }), [notes]);
  const summaryData = useMemo(
    () =>
      summary &&
      summary.content.length > 0 && {
        id: Obj.getDXN(meeting).toString(),
        subject: summary,
      },
    [summary, summary?.content],
  );

  const handleGenerateSummary = useCallback(async () => {
    await dispatch(createIntent(MeetingAction.Summarize, { meeting }));
  }, [dispatch, meeting]);

  if (!notes || !summary) {
    return null;
  }

  return (
    <StackItem.Content>
      <Stack orientation='vertical' size='contain' rail>
        <StackItem.Root item={notes} role='section'>
          <StackItem.Heading>
            <StackItem.HeadingStickyContent>
              <StackItem.Sigil icon='ph--note--regular' triggerLabel={t('notes label')} />
            </StackItem.HeadingStickyContent>
          </StackItem.Heading>
          <StackItem.Content>
            <Surface role='section' data={notesData} />
          </StackItem.Content>
        </StackItem.Root>
        <StackItem.Root item={summary} role='section'>
          <StackItem.Heading>
            <StackItem.HeadingStickyContent>
              <StackItem.Sigil icon='ph--list-bullets--regular' triggerLabel={t('summary label')} />
              {summaryData && (
                <IconButton
                  iconOnly
                  variant='ghost'
                  icon='ph--book-open-text--regular'
                  label={t('regenerate summary label')}
                  onClick={handleGenerateSummary}
                  tooltipSide='right'
                  classNames='is-full'
                />
              )}
            </StackItem.HeadingStickyContent>
          </StackItem.Heading>
          <StackItem.Content>
            {summaryData ? (
              <Surface role='section' data={summaryData} />
            ) : (
              <div className='grid place-items-center min-h-32'>
                <IconButton
                  icon='ph--book-open-text--regular'
                  label={t('generate summary label')}
                  onClick={handleGenerateSummary}
                />
              </div>
            )}
          </StackItem.Content>
        </StackItem.Root>
      </Stack>
    </StackItem.Content>
  );
};

export default MeetingContainer;
