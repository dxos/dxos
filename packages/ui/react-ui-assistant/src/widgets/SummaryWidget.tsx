//
// Copyright 2025 DXOS.org
//

import React from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';
import { type WidgetProps, getXmlTextChild } from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';

import { translationKey } from '../translations.ts';
import { PANEL_FRAME, WidgetPanel } from './WidgetPanel.tsx';

export const SummaryWidget = ({ children }: WidgetProps) => {
  const { t } = Hooks.useTranslation(translationKey);

  return (
    <WidgetPanel icon='ph--list-bullets--regular' label={t('summary.label')} testId='assistant.summary'>
      <div className={mx(PANEL_FRAME, 'p-trim-sm text-sm text-fg-muted')}>{getXmlTextChild(children ?? [])}</div>
    </WidgetPanel>
  );
};
