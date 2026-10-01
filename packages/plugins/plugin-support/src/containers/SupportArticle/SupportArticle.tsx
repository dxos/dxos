//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { Column, Flex, useTranslation } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';

import { meta } from '#meta';
import { Support } from '#types';

export type SupportArticleProps = AppSurface.ObjectArticleProps<Support.Ticket>;

export const SupportArticle = ({ role, subject }: SupportArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [ticket] = useObject(subject);

  const handleSetTitle = useCallback(
    (value: string) => {
      Obj.update(subject, (subject) => {
        const mutable = subject as Obj.Mutable<typeof subject>;
        mutable.title = value;
      });
    },
    [subject],
  );

  const handleSetBody = useCallback(
    (value: string) => {
      Obj.update(subject, (subject) => {
        const mutable = subject as Obj.Mutable<typeof subject>;
        mutable.body = value;
      });
    },
    [subject],
  );

  const handleSetResolution = useCallback(
    (value: string) => {
      Obj.update(subject, (subject) => {
        const mutable = subject as Obj.Mutable<typeof subject>;
        mutable.resolution = value;
      });
    },
    [subject],
  );

  const handleStatus = useCallback(
    (status: Support.TicketStatus) => {
      Obj.update(subject, (subject) => {
        const mutable = subject as Obj.Mutable<typeof subject>;
        mutable.status = status;
      });
    },
    [subject],
  );

  const status = ticket.status ?? 'open';

  return (
    <Next.Panel.Root role={role}>
      <Next.Panel.Header>
        <Next.Toolbar.Root>
          <Next.Toolbar.Text>{t(`status-${status}.label`)}</Next.Toolbar.Text>
        </Next.Toolbar.Root>
      </Next.Panel.Header>
      <Next.Panel.Body asChild>
        <Column.Root>
          <Next.ScrollArea.Root orientation='vertical'>
            <Next.ScrollArea.Viewport>
              <Next.Field.Root>
                <Next.Field.Label>{t('title.label')}</Next.Field.Label>
                <Next.Input value={ticket.title ?? ''} onChange={(event) => handleSetTitle(event.target.value)} />
              </Next.Field.Root>

              <Next.Field.Root>
                <Next.Field.Label>{t('body.label')}</Next.Field.Label>
                <Next.Textarea value={ticket.body ?? ''} onChange={(event) => handleSetBody(event.target.value)} />
              </Next.Field.Root>

              {status === 'resolved' && (
                <Next.Field.Root>
                  <Next.Field.Label>{t('resolution.label')}</Next.Field.Label>
                  <Next.Textarea
                    value={ticket.resolution ?? ''}
                    onChange={(event) => handleSetResolution(event.target.value)}
                  />
                </Next.Field.Root>
              )}

              <Flex gap='sm' align='center'>
                {status === 'open' && (
                  <Next.Button variant='outline' onClick={() => handleStatus('in_progress')}>
                    {t('mark-in-progress.button')}
                  </Next.Button>
                )}
                {status !== 'resolved' && (
                  <Next.Button variant='primary' onClick={() => handleStatus('resolved')}>
                    {t('resolve.button')}
                  </Next.Button>
                )}
                {status === 'resolved' && (
                  <Next.Button variant='outline' onClick={() => handleStatus('open')}>
                    {t('reopen.button')}
                  </Next.Button>
                )}
              </Flex>
            </Next.ScrollArea.Viewport>
          </Next.ScrollArea.Root>
        </Column.Root>
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};

SupportArticle.displayName = 'SupportArticle';
