//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { TogglePanel } from '@dxos/react-ui-components';
import * as Hooks from '@dxos/react-ui/Hooks';
import { type WidgetProps, getXmlTextChild } from '@dxos/ui-editor';

import { translationKey } from '../translations.ts';

export const SummaryWidget = ({ children }: WidgetProps) => {
  const { t } = Hooks.useTranslation(translationKey);

  return (
    <TogglePanel.Root>
      <TogglePanel.Content classNames='border border-subdued-separator rounded-md'>
        <TogglePanel.Header classNames='text-sm dx-group-surface'>{t('summary.label')}</TogglePanel.Header>
        <TogglePanel.Body>
          <div className='p-1 text-sm text-subdued'>{getXmlTextChild(children ?? [])}</div>
        </TogglePanel.Body>
      </TogglePanel.Content>
    </TogglePanel.Root>
  );
};
