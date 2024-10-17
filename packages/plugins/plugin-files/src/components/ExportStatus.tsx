//
// Copyright 2024 DXOS.org
//

import { ArrowsClockwise, CheckCircle } from '@phosphor-icons/react';
import React from 'react';

import { StatusBar } from '@dxos/plugin-status-bar';
import { useTranslation } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

import { FILES_PLUGIN } from '../meta';

export const ExportStatus = ({ running, lastExport }: { running: boolean; lastExport?: number }) => {
  const { t } = useTranslation(FILES_PLUGIN);
  return (
    <StatusBar.Item
      title={
        running
          ? t('currently exporting label')
          : lastExport
            ? t('last export at label', {
                value: new Date(lastExport),
                formatParams: {
                  value: { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' },
                },
              })
            : t('no previous exports label')
      }
    >
      {running ? <ArrowsClockwise className={getSize(3)} /> : <CheckCircle className={getSize(3)} />}
    </StatusBar.Item>
  );
};
