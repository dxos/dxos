//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { AppSurface } from '@dxos/app-toolkit/ui';
import { useTranslation } from '@dxos/react-ui';
import { Settings } from '@dxos/react-ui-form';

import { meta } from '#meta';

import { AutomationPanel, type AutomationPanelProps } from '../../components/AutomationPanel';
import { TriggersSettings } from '../TriggerSettings';

export type AutomationSettingsProps = AppSurface.SpaceArticleProps<Omit<AutomationPanelProps, 'space'>>;

export const AutomationSettings = (props: AutomationSettingsProps) => {
  const { t } = useTranslation(meta.id);
  return (
    <Settings.Viewport>
      <Settings.Section
        title={t('automation-verbose.label', { ns: meta.id })}
        description={t('automation.description', { ns: meta.id })}
      >
        <AutomationPanel {...props} />
        <TriggersSettings space={props.space} />
      </Settings.Section>
    </Settings.Viewport>
  );
};
