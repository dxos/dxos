//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { StatusBar } from '@dxos/plugin-status-bar';
import { Icon, useTranslation } from '@dxos/react-ui';
import { getSize } from '@dxos/ui-theme';

import { meta } from '../meta';

export const ExportStatus = ({ running, lastExport }: { running: boolean; lastExport?: number }) => {
  const { t } = useTranslation(meta.id);
  return (
    <StatusBar.Item
      title={
        running
          ? t('currently exporting label')
          : lastExport
            ? t('last export at label', {
                value: new Date(lastExport),
                formatProps: {
                  value: { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' },
                },
              })
            : t('no previous exports label')
      }
    >
      {running ? (
        <Icon icon='ph--arrows-clockwise--regular' classNames={getSize(3)} />
      ) : (
        <Icon icon='ph--check-circle--regular' classNames={getSize(3)} />
      )}
    </StatusBar.Item>
  );
};
