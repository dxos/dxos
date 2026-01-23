//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type Database } from '@dxos/echo';
import { Input, useTranslation } from '@dxos/react-ui';
import { ControlItemInput } from '@dxos/react-ui-form';

import { useTriggerRuntimeControls } from '../hooks';
import { meta } from '../meta';

export const TriggersSettings = ({ db }: { db: Database.Database }) => {
  const { triggers, isRunning, start, stop } = useTriggerRuntimeControls(db);
  const { t } = useTranslation(meta.id);

  return (
    <div className='container-max-width grid grid-cols-1 md:grid-cols-[1fr_min-content]'>
      <ControlItemInput title={t('runtime label')} description={t('runtime description')}>
        <Input.Switch classNames='justify-self-end' checked={isRunning} onCheckedChange={isRunning ? stop : start} />
      </ControlItemInput>
    </div>
  );
};
