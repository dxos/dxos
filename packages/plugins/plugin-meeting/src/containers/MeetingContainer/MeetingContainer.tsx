//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import { type ObjectSurfaceProps } from '@dxos/app-toolkit/ui';
import { IconButton, Panel, useTranslation } from '@dxos/react-ui';
import { Stack, StackItem } from '@dxos/react-ui-stack';

import { meta } from '#meta';
import { type Meeting } from '#types';
import { MeetingOperation } from '#operations';

export type MeetingContainerProps = ObjectSurfaceProps<Meeting.Meeting>;

export const MeetingContainer = ({ attendableId, role, subject: meeting }: MeetingContainerProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const notes = meeting.notes?.target;
  const summary = meeting.summary?.target;
  const notesData = useMemo(() => ({ attendableId, subject: notes }), [attendableId, notes]);
  const summaryData = useMemo(
    () =>
      summary &&
      summary.content.length > 0 && {
        attendableId,
        subject: summary,
      },
    [attendableId, summary, summary?.content],
  );

  const handleGenerateSummary = useCallback(async () => {
    await invokePromise(MeetingOperation.Summarize, { meeting });
  }, [invokePromise, meeting]);

  if (!notes || !summary) {
    return null;
  }

  return (
    <Panel.Root role={role}>
      <Panel.Content asChild>
        <Stack orientation='vertical' size='contain' rail>
          <StackItem.Root item={notes} role='section'>
            <StackItem.Heading>
              <StackItem.HeadingStickyContent>
                <StackItem.Sigil icon='ph--note--regular' triggerLabel={t('notes.label')} />
              </StackItem.HeadingStickyContent>
            </StackItem.Heading>
            <StackItem.Content>
              <Surface.Surface role='section' data={notesData} />
            </StackItem.Content>
          </StackItem.Root>
          <StackItem.Root item={summary} role='section'>
            <StackItem.Heading>
              <StackItem.HeadingStickyContent>
                <StackItem.Sigil icon='ph--list-bullets--regular' triggerLabel={t('summary.label')} />
                {summaryData && (
                  <IconButton
                    iconOnly
                    variant='ghost'
                    icon='ph--book-open-text--regular'
                    label={t('regenerate-summary.label')}
                    onClick={handleGenerateSummary}
                    tooltipSide='right'
                    classNames='w-full'
                  />
                )}
              </StackItem.HeadingStickyContent>
            </StackItem.Heading>
            <StackItem.Content>
              {summaryData ? (
                <Surface.Surface role='section' data={summaryData} />
              ) : (
                <div className='grid place-items-center min-h-32'>
                  <IconButton
                    icon='ph--book-open-text--regular'
                    label={t('generate-summary.label')}
                    onClick={handleGenerateSummary}
                  />
                </div>
              )}
            </StackItem.Content>
          </StackItem.Root>
        </Stack>
      </Panel.Content>
    </Panel.Root>
  );
};
