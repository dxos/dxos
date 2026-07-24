//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { StatusBar } from '@dxos/plugin-status-bar/components';
import { IconButton, Popover, useTranslation } from '@dxos/react-ui';
import { LogPanel } from '@dxos/react-ui-debug';

import { meta } from '#meta';

/** Status-bar button that opens the log panel in a popover for a quick glance. */
export const LogStatus = () => {
  const { t } = useTranslation(meta.profile.key);

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <StatusBar.Item>
          <IconButton variant='ghost' icon='ph--list-magnifying-glass--regular' iconOnly label={t('open-logs.label')} />
        </StatusBar.Item>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content side='top'>
          <Popover.Viewport classNames='is-[40rem] bs-[24rem]'>
            <LogPanel />
          </Popover.Viewport>
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

LogStatus.displayName = 'LogStatus';
