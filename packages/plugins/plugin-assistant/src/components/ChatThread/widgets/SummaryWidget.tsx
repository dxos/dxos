//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { TogglePanel } from '@dxos/react-ui-components';
import { type XmlWidgetProps } from '@dxos/ui-editor';

import { meta } from '#meta';

import { MessageThreadContext } from '../sync';
import { styles } from './defaults';

export const SummaryWidget = ({ children }: XmlWidgetProps<MessageThreadContext>) => {
  const { t } = useTranslation(meta.id);

  return (
    <TogglePanel.Root classNames={styles.border}>
      <TogglePanel.Header classNames='text-sm bg-group-surface'>{t('summary.label')}</TogglePanel.Header>
      <TogglePanel.Content>
        <div role='none' className='p-1 text-sm text-subdued'>
          {children}
        </div>
      </TogglePanel.Content>
    </TogglePanel.Root>
  );
};
