//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { TogglePanel } from '@dxos/react-ui-components';
import { type XmlWidgetProps } from '@dxos/ui-editor';

import { meta } from '#meta';

import { MessageThreadContext } from '../sync';

export const SummaryWidget = ({ children }: XmlWidgetProps<MessageThreadContext>) => {
  const { t } = useTranslation(meta.id);

  return (
    <TogglePanel.Root>
      <TogglePanel.Header classNames='bg-group-surface text-sm'>{t('summary.label')}</TogglePanel.Header>
      <TogglePanel.Content>
        <div role='none' className='p-1 text-sm text-description'>
          {children}
        </div>
      </TogglePanel.Content>
    </TogglePanel.Root>
  );
};
