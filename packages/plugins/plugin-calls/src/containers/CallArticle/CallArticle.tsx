//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { IconButton, useTranslation } from '@dxos/react-ui';
import { Stack, StackItem } from '@dxos/react-ui-stack';

import { meta } from '#meta';
import { type Call, CallOperation } from '#types';

export type CallArticleProps = AppSurface.ObjectArticleProps<Call.Call>;

export const CallArticle = ({ attendableId, role, subject: call }: CallArticleProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const notes = call.notes?.target;
  const summary = call.summary?.target;
  const notesData = useMemo(() => ({ attendableId, subject: notes }), [attendableId, notes]);
  const summaryData = useMemo(
    () => summary && summary.content.length > 0 && { attendableId, subject: summary },
    [attendableId, summary, summary?.content],
  );

  const handleGenerateSummary = useCallback(async () => {
    await invokePromise(CallOperation.Summarize, { call });
  }, [invokePromise, call]);

  if (!notes || !summary) {
    return null;
  }

  return (
    <Stack orientation='vertical' size='contain' rail>
      <StackItem.Root item={notes} role='section'>
        <StackItem.Heading>
          <StackItem.HeadingStickyContent>
            <StackItem.Sigil icon='ph--note--regular' triggerLabel={t('notes.label')} />
          </StackItem.HeadingStickyContent>
        </StackItem.Heading>
        <StackItem.Content>
          <Surface.Surface type={AppSurface.Section} data={notesData} />
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
            <Surface.Surface type={AppSurface.Section} data={summaryData} />
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
  );
};
