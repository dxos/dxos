//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import * as Button from '@dxos/react-ui/Button';
import * as Column from '@dxos/react-ui/Column';
import * as Field from '@dxos/react-ui/Field';
import * as Flex from '@dxos/react-ui/Flex';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { meta } from '#meta';
import { Support } from '#types';

export type SupportArticleProps = AppSurface.ObjectArticleProps<Support.Ticket>;

export const SupportArticle = ({ role, subject }: SupportArticleProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
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
              <Field.Root>
                <Field.Label>{t('title.label')}</Field.Label>
                <Field.Input value={ticket.title ?? ''} onChange={(event) => handleSetTitle(event.target.value)} />
              </Field.Root>

              <Field.Root>
                <Field.Label>{t('body.label')}</Field.Label>
                <Field.Textarea value={ticket.body ?? ''} onChange={(event) => handleSetBody(event.target.value)} />
              </Field.Root>

              {status === 'resolved' && (
                <Field.Root>
                  <Field.Label>{t('resolution.label')}</Field.Label>
                  <Field.Textarea
                    value={ticket.resolution ?? ''}
                    onChange={(event) => handleSetResolution(event.target.value)}
                  />
                </Field.Root>
              )}

              <Flex.Root gap='sm' align='center'>
                {status === 'open' && (
                  <Button.Root variant='outline' onClick={() => handleStatus('in_progress')}>
                    {t('mark-in-progress.button')}
                  </Button.Root>
                )}
                {status !== 'resolved' && (
                  <Button.Root variant='primary' onClick={() => handleStatus('resolved')}>
                    {t('resolve.button')}
                  </Button.Root>
                )}
                {status === 'resolved' && (
                  <Button.Root variant='outline' onClick={() => handleStatus('open')}>
                    {t('reopen.button')}
                  </Button.Root>
                )}
              </Flex.Root>
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Column.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

SupportArticle.displayName = 'SupportArticle';
