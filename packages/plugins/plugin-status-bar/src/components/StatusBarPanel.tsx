//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { createIntent, Surface, useIntentDispatcher } from '@dxos/app-framework';
import { ObservabilityAction, type UserFeedback } from '@dxos/plugin-observability/types';
import { Icon, Popover, useTranslation } from '@dxos/react-ui';

import { FeedbackForm } from './FeedbackForm';
import { StatusBar } from './StatusBar';
import { VersionNumber } from './VersionNumber';
import { STATUS_BAR_PLUGIN } from '../meta';

export const StatusBarActions = () => {
  const { t } = useTranslation(STATUS_BAR_PLUGIN);
  const [open, setOpen] = useState(false);
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  const handleSave = useCallback(
    (values: UserFeedback) => {
      void dispatch(createIntent(ObservabilityAction.CaptureUserFeedback, values));
      setOpen(false);
    },
    [dispatch],
  );

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <StatusBar.Button data-joyride='welcome/feedback'>
          <Icon icon='ph--paper-plane-tilt--regular' size={4} />
          <StatusBar.Text classNames='hidden sm:block'>{t('feedback label')}</StatusBar.Text>
        </StatusBar.Button>
      </Popover.Trigger>
      {/* TODO(zan): Configure this label? */}
      <StatusBar.Button asChild>
        <a href='https://dxos.org/discord' target='_blank' rel='noopener noreferrer'>
          <Icon icon='ph--discord-logo--regular' size={4} />
          <StatusBar.Text classNames='hidden sm:block'>{t('discord label')}</StatusBar.Text>
        </a>
      </StatusBar.Button>
      <VersionNumber />
      <Popover.Portal>
        <Popover.Content classNames='shadow-lg'>
          <FeedbackForm onSave={handleSave} />
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

export const StatusBarPanel = () => {
  return (
    <>
      <StatusBarActions />
      <span role='separator' className='grow' />
      <Surface role='status' />
    </>
  );
};
