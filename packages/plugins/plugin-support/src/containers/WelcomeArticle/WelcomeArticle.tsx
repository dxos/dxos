//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { ASSISTANT_COMPANION_VARIANT } from '@dxos/plugin-assistant';
import { Button, Panel, ScrollArea, Toolbar, useTranslation } from '@dxos/react-ui';
import { linkedSegment } from '@dxos/react-ui-attention';

import { meta } from '#meta';
import { HelpOperation } from '#types';

export type WelcomeArticleProps = {
  role?: string;
};

/** Placeholder Welcome surface — hosts the entry point for the joyride tour. */
export const WelcomeArticle = ({ role }: WelcomeArticleProps = {}) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();

  const handleStartTour = useCallback(() => {
    void invokePromise(HelpOperation.Start);
  }, [invokePromise]);

  const handleOpenChat = useCallback(() => {
    void invokePromise(LayoutOperation.UpdateCompanion, {
      subject: linkedSegment(ASSISTANT_COMPANION_VARIANT),
    });
  }, [invokePromise]);

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Button onClick={handleStartTour}>{t('start-tour.button')}</Toolbar.Button>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport classNames='p-8 flex flex-col items-center gap-4'>
            <h1 className='text-2xl font-semibold'>{t('welcome.title')}</h1>
            <p className='max-w-prose text-center text-description'>{t('welcome.description')}</p>
            <Button variant='primary' onClick={handleOpenChat}>
              {t('open-chat.button')}
            </Button>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};
