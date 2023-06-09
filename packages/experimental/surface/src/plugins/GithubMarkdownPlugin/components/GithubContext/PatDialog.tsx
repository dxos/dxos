//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { useTranslation } from '@dxos/aurora';
import { Input } from '@dxos/react-appkit';

import { useSplitViewContext } from '../../../SplitViewPlugin';
import { useOctokitContext } from './OctokitProvider';

export const PatDialog = () => {
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
    <>
      <Input
        label={t('github pat label')}
        value={patValue}
        data-testid='composer.githubPat'
        onChange={({ target: { value } }) => setPatValue(value)}
        slots={{
          root: { className: 'mlb-2' },
          input: { autoFocus: true, spellCheck: false, className: 'font-mono' },
        }}
      />
    </>
  );
};
