//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { Settings } from '@dxos/react-ui-form';

import { AutomationPanel, type AutomationPanelProps } from '../../components/AutomationPanel';
import { meta } from '../../meta';
import { TriggersSettings } from '../TriggerSettings/TriggerSettings';

export const AutomationSettings = (props: AutomationPanelProps) => {
  const { t } = useTranslation(meta.id);
  return (
    <Settings.Root>
      <Settings.Section
        title={t('automation verbose label', { ns: meta.id })}
        description={t('automation description', { ns: meta.id })}
      >
        <AutomationPanel {...props} />
        <TriggersSettings db={props.space.db} />
      </Settings.Section>
    </Settings.Root>
  );
};
