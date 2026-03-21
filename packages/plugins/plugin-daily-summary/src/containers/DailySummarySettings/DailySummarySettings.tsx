//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { useClient } from '@dxos/react-client';
import { IconButton, useTranslation } from '@dxos/react-ui';
import { Settings } from '@dxos/react-ui-form';

import { generateSummaryInSpace } from '../../blueprints/functions/generate-imperative';
import { meta } from '../../meta';
import { type DailySummarySettingsProps } from '../../types';

export type DailySummarySettingsComponentProps = {
  settings: DailySummarySettingsProps;
  onSettingsChange: (fn: (current: DailySummarySettingsProps) => DailySummarySettingsProps) => void;
};

export const DailySummarySettings = ({ settings, onSettingsChange }: DailySummarySettingsComponentProps) => {
  const { t } = useTranslation(meta.id);
  const client = useClient();
  const [generating, setGenerating] = useState(false);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      await generateSummaryInSpace(client.spaces.default);
    } finally {
      setGenerating(false);
    }
  }, [client]);

  return (
    <Settings.Root>
      <Settings.Section title={t('plugin name', { ns: meta.id })}>
        <Settings.Group>
          <Settings.ItemInput title={t('generate summary label')}>
            <IconButton
              classNames='ms-2'
              icon={generating ? 'ph--spinner--regular' : 'ph--play--regular'}
              iconOnly
              disabled={generating}
              label={t('generate summary label')}
              onClick={handleGenerate}
            />
          </Settings.ItemInput>
        </Settings.Group>
      </Settings.Section>
    </Settings.Root>
  );
};
