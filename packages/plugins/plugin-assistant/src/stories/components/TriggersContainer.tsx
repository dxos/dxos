//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { AutomationPanel } from '@dxos/plugin-automation';
import { Input, Toolbar, useTranslation } from '@dxos/react-ui';

import { useTriggerRuntimeControls } from '../../hooks';
import { meta } from '../../meta';

import type { ComponentProps } from './types';

export const TriggersContainer = ({ space }: ComponentProps) => {
  const { t } = useTranslation(meta.id);
  const { triggers, isRunning, start, stop } = useTriggerRuntimeControls(space);
  return (
    <div className='flex flex-col p-2'>
      <Toolbar.Root>
        <Input.Root>
          <div>{isRunning ? t('trigger dispatcher running') : t('trigger dispatcher stopped')}</div>
          <Input.Switch classNames='mis-2 mie-2' checked={isRunning} onCheckedChange={isRunning ? stop : start} />
        </Input.Root>
      </Toolbar.Root>

      <AutomationPanel classNames='p-2' space={space} />
    </div>
  );
};
