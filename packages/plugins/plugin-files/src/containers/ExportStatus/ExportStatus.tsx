//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { StatusBar } from '@dxos/plugin-status-bar';
import { IconButton, useTranslation } from '@dxos/react-ui';

import { meta } from '../../meta';

export type ExportStatusProps = {
  running: boolean;
  lastExport?: number;
};

export const ExportStatus = ({ running, lastExport }: ExportStatusProps) => {
  const { t } = useTranslation(meta.id);
  return (
    <StatusBar.Item>
      {running ? (
        <IconButton
          variant='ghost'
          icon='ph--arrows-clockwise--regular'
          iconOnly
          label={t('currently exporting label')}
        />
      ) : (
        <IconButton
          variant='ghost'
          icon='ph--check-circle--regular'
          iconOnly
          label={
            lastExport
              ? t('last export at label', {
                  value: new Date(lastExport),
                  formatProps: {
                    value: {
                      year: 'numeric',
                      month: 'numeric',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: 'numeric',
                    },
                  },
                })
              : t('no previous exports label')
          }
        />
      )}
    </StatusBar.Item>
  );
};
