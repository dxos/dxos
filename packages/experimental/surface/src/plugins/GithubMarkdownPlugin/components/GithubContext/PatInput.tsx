//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Input, useTranslation } from '@dxos/aurora';

import { useSplitViewContext } from '../../../SplitViewPlugin';
import { useOctokitContext } from './OctokitProvider';

export const PatInput = () => {
  const { t } = useTranslation('composer');
  const { pat, setPat } = useOctokitContext();
  const [patValue, setPatValue] = useState(pat);
  const { dialogOpen } = useSplitViewContext();

  useEffect(() => {
    setPatValue(pat);
  }, [pat]);

  useEffect(() => {
    if (!dialogOpen) {
      void setPat(patValue);
    }
  }, [dialogOpen]);

  return (
    <Input.Root>
      <div role='none' className='mlb-2'>
        <Input.Label>{t('github pat label')}</Input.Label>
        <Input.TextInput
          autoFocus
          spellCheck={false}
          classNames='font-mono'
          value={patValue}
          onChange={({ target: { value } }) => setPatValue(value)}
        />
      </div>
    </Input.Root>
  );
};
