//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import type { Space } from '@dxos/client/echo';
import { Obj, Ref } from '@dxos/echo';
import { Trigger } from '@dxos/functions';
import { Operation } from '@dxos/operation';
import { IconButton, useTranslation } from '@dxos/react-ui';

import { GenerateSummary } from '../../blueprints/functions/definitions';
import { meta } from '../../meta';

export type DailySummarySettingsProps = {
  space: Space;
};

export const DailySummarySettings = ({ space }: DailySummarySettingsProps) => {
  const { t } = useTranslation(meta.id);

  const handleCreateTrigger = useCallback(() => {
    const trigger = Trigger.make({
      enabled: true,
      spec: {
        kind: 'timer',
        cron: '0 21 * * *',
      },
      function: Ref.make(Operation.serialize(GenerateSummary)),
    });
    space.db.add(trigger);
  }, [space]);

  return (
    <div className='flex flex-col gap-4 p-4'>
      <h2 className='text-lg font-medium'>{t('plugin name')}</h2>
      <p className='text-sm text-description'>{t('create trigger description')}</p>
      <div>
        <IconButton
          icon='ph--plus--regular'
          label={t('create trigger label')}
          onClick={handleCreateTrigger}
        />
      </div>
    </div>
  );
};
