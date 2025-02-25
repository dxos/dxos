//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Dialog, Icon, useTranslation } from '@dxos/react-ui';

import { AUTOMATION_PLUGIN } from '../../meta';

const preventDefault = (event: Event) => event.preventDefault();

export const AmbientChatDialog = () => {
  const { t } = useTranslation(AUTOMATION_PLUGIN);
  return (
    <div role='none' className='dx-dialog__overlay bg-transparent pointer-events-none' data-block-align='end'>
      <Dialog.Content onInteractOutside={preventDefault} classNames='pointer-events-auto' inOverlayLayout>
        <Dialog.Title classNames='sr-only'>{t('ambient chat dialog title')}</Dialog.Title>
        <Dialog.Close>
          <Icon icon='ph--x--regular' size={4} />
        </Dialog.Close>
        <h1>Hello</h1>
      </Dialog.Content>
    </div>
  );
};
