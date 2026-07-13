//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Button, Column, Input, Panel, ScrollArea, Toolbar, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { type Support } from '#types';

export type SupportArticleProps = AppSurface.ObjectArticleProps<Support.Ticket>;

export const SupportArticle = ({ role, subject: ticket }: SupportArticleProps) => {
  const { t } = useTranslation(meta.profile.key);

  const handleSetTitle = useCallback(
    (value: string) => {
      Obj.update(ticket, (ticket) => {
        const mutable = ticket as Obj.Mutable<typeof ticket>;
        mutable.title = value;
      });
    },
    [ticket],
  );

  const handleSetBody = useCallback(
    (value: string) => {
      Obj.update(ticket, (ticket) => {
        const mutable = ticket as Obj.Mutable<typeof ticket>;
        mutable.body = value;
      });
    },
    [ticket],
  );

  const handleSetResolution = useCallback(
    (value: string) => {
      Obj.update(ticket, (ticket) => {
        const mutable = ticket as Obj.Mutable<typeof ticket>;
        mutable.resolution = value;
      });
    },
    [ticket],
  );

  const handleStatus = useCallback(
    (status: Support.TicketStatus) => {
      Obj.update(ticket, (ticket) => {
        const mutable = ticket as Obj.Mutable<typeof ticket>;
        mutable.status = status;
      });
    },
    [ticket],
  );

  const status = ticket.status ?? 'open';

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Text>{t(`status-${status}.label`)}</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content asChild>
        <Column.Root>
          <ScrollArea.Root orientation='vertical' padding>
            <ScrollArea.Viewport>
              <Input.Root>
                <Input.Label>{t('title.label')}</Input.Label>
                <Input.TextInput value={ticket.title ?? ''} onChange={(event) => handleSetTitle(event.target.value)} />
              </Input.Root>

              <Input.Root>
                <Input.Label>{t('body.label')}</Input.Label>
                <Input.TextArea value={ticket.body ?? ''} onChange={(event) => handleSetBody(event.target.value)} />
              </Input.Root>

              {status === 'resolved' && (
                <Input.Root>
                  <Input.Label>{t('resolution.label')}</Input.Label>
                  <Input.TextArea
                    value={ticket.resolution ?? ''}
                    onChange={(event) => handleSetResolution(event.target.value)}
                  />
                </Input.Root>
              )}

              <div className='flex items-center gap-2'>
                {status === 'open' && (
                  <Button variant='outline' onClick={() => handleStatus('in_progress')}>
                    {t('mark-in-progress.button')}
                  </Button>
                )}
                {status !== 'resolved' && (
                  <Button variant='primary' onClick={() => handleStatus('resolved')}>
                    {t('resolve.button')}
                  </Button>
                )}
                {status === 'resolved' && (
                  <Button variant='outline' onClick={() => handleStatus('open')}>
                    {t('reopen.button')}
                  </Button>
                )}
              </div>
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Column.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

SupportArticle.displayName = 'SupportArticle';
