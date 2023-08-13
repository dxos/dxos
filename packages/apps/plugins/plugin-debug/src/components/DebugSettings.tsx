//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Input, useTranslation } from '@dxos/aurora';
import { useKeyStore } from '@dxos/react-client/halo';

import { DEBUG_PLUGIN } from '../props';

// TODO(burdon): Standardize key name (see GH plugin).
export const DebugPanelKey = 'dxos.org/settings/debug';

export const DebugSettings = () => {
  const { t } = useTranslation(DEBUG_PLUGIN);
  // TODO(burdon): Factor out.
  const [keyMap, setKey] = useKeyStore([DebugPanelKey]);
  const visible = !!keyMap.get(DebugPanelKey);
  const handleSetVisible = (checked: boolean) => {
    setKey(DebugPanelKey, checked ? 'true' : '');
  };

  return (
    <Input.Root>
      {/* TODO(burdon): Requires custom CSS. */}
      <Input.Root>
        <div className='flex gap-2'>
          <Input.Checkbox checked={visible} onCheckedChange={(checked) => handleSetVisible(!!checked)} />
          <Input.Label>{t('show debug panel')}</Input.Label>
        </div>
      </Input.Root>
    </Input.Root>
  );
};
