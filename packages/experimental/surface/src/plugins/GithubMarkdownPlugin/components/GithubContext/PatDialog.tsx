//
// Copyright 2023 DXOS.org
//

import React, { Dispatch, SetStateAction, useEffect, useState } from 'react';

import { Button, useTranslation } from '@dxos/aurora';
import { Dialog, Input } from '@dxos/react-appkit';

import { useOctokitContext } from './OctokitProvider';

export type PatDialogProps = {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  title?: string;
  description?: string;
};

export const PatDialog = ({ open, setOpen, title, description }: PatDialogProps) => {
  const { t } = useTranslation('composer');
  const { pat, setPat } = useOctokitContext();
  const [patValue, setPatValue] = useState(pat);

  useEffect(() => {
    setPatValue(pat);
  }, [pat]);

  return (
    <Dialog
      title={title ?? t('profile settings label')}
      {...(description && { description })}
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          void setPat(patValue);
        }
      }}
      closeTriggers={[
        <Button key='a1' variant='primary' data-testid='composer.closeUserSettingsDialog'>
          {t('done label', { ns: 'os' })}
        </Button>,
      ]}
    >
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
    </Dialog>
  );
};
