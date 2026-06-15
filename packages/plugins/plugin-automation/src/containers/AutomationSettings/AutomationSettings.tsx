//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { AppSurface } from '@dxos/app-toolkit/ui';
import { useTranslation } from '@dxos/react-ui';
import { Settings } from '@dxos/react-ui-form';

import { meta } from '#meta';

import { TriggersSettings } from '../TriggerSettings';

export type AutomationSettingsProps = AppSurface.SpaceArticleProps;

/**
 * Space-level automation settings. Individual automations are now first-class objects (configured in their
 * article + per-object companion), so this page is focused on runtime management — where the space's
 * automations execute.
 */
export const AutomationSettings = ({ space }: AutomationSettingsProps) => {
  const { t } = useTranslation(meta.id);
  return (
    <Settings.Viewport>
      <Settings.Section
        title={t('automation-verbose.label', { ns: meta.id })}
        description={t('automation.description', { ns: meta.id })}
      >
        <TriggersSettings space={space} />
      </Settings.Section>
    </Settings.Viewport>
  );
};
